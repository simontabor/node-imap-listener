var util = require('util');
var events = require('events').EventEmitter;
var ImapConnection = require('imap').ImapConnection;
var MailParser = require("mailparser").MailParser;

var imapListener = function(opts) {
	this.connection = new ImapConnection(opts);
};

util.inherits(imapListener,events);

imapListener.prototype.start = function() {
	var self = this;
	self.connection.connect(function(err) {
		if (err) return self.emit('error',err);

		self.emit('connected');

		self.connection.openBox("INBOX",false,function(err) {
			if (err) return self.emit('error',err);
			self.connection.on('mail',function(id) {
				self.emit('recieved',id);
				self.connection.search(["UNSEEN"],function(err,results) {
					if (err) return self.emit('error',err);
					var fetch = self.connection.fetch(results,{
						markSeen: true,
						request: {
							headers: false,
							body: "full"
						}
					});
					fetch.on('message',function(msg) {
						var mp = new MailParser();
						msg.on('data',function(chunk) {
							mp.write(chunk.toString());
						});
						mp.on('end',function(mail) {
							self.emit('message',mail);
						});
						msg.on('end',function() {
							mp.end();
						});
					});
				});
			});
		});
	});
};

imapListener.prototype.stop = function() {
	var self = this;
	self.connection.logout(function() {
		self.emit('disconnected');
	});
};

module.exports = function(opts) {
  return new imapListener(opts);
};
/* eslint-disable */

// Error class
//
// Based on:
// http://stackoverflow.com/questions/8458984/how-do-i-get-a-correct-backtrace-for-a-custom-error-class-in-nodejs
//
'use strict';


var inherits = require('util').inherits;


function HeadlessError(message) {
  // Super constructor
  Error.call(this);

  // Super helper method to include stack trace in error object
  Error.captureStackTrace(this, this.constructor);

  // Set our function’s name as error name
  this.name = this.constructor.name;

  // Set the error message
  this.message = message;
}


// Inherit from Error
inherits(HeadlessError, Error);


module.exports = HeadlessError;

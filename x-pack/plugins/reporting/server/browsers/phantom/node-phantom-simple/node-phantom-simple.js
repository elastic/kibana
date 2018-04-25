/* eslint-disable */
/*global document*/

'use strict';


var HeadlessError   = require('./headless_error');
var http            = require('http');
var spawn           = require('child_process').spawn;
var exec            = require('child_process').exec;
var util            = require('util');
var path            = require('path');
var debug           = require('debug');

var POLL_INTERVAL   = process.env.POLL_INTERVAL || 500;

var logger = {
  debug: debug('node-phantom-simple:debug'),
  warn: debug('node-phantom-simple:warn'),
  error: debug('node-phantom-simple:error')
};

var queue = function (worker) {
  var _q = [];
  var running = false;
  var q = {
    push: function (obj) {
      _q.push(obj);
      q.process();
    },
    process: function () {
      if (running || _q.length === 0) { return; }
      running = true;
      var cb = function () {
        running = false;
        q.process();
      };
      var task = _q.shift();
      worker(task, cb);
    }
  };

  return q;
};

function callbackOrDummy (callback, poll_func) {
  if (!callback) { return function () {}; }

  if (poll_func) {
    return function () {
      var args = Array.prototype.slice.call(arguments);

      poll_func(function (err) {
        if (err) {
          // We could send back the original arguments,
          // but I'm assuming that this error is better.
          callback(err);
          return;
        }

        callback.apply(null, args);
      });
    };
  }

  return callback;
}

function unwrapArray (arr) {
  return arr && arr.length === 1 ? arr[0] : arr;
}

function wrapArray(arr) {
  // Ensure that arr is an Array
  return (arr instanceof Array) ? arr : [ arr ];
}

function clone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  var copy = {};

  for (var attr in obj) {
    if (obj.hasOwnProperty(attr)) {
      copy[attr] = clone(obj[attr]);
    }
  }

  return copy;
}


var pageEvaluateDeprecatedFn = util.deprecate(function () {}, "Deprecated 'page.evaluate(fn, callback, args...)' syntax - use 'page.evaluate(fn, args..., callback)' instead");
var createDeprecatedFn = util.deprecate(function () {}, "Deprecated '.create(callback, options)' syntax - use '.create(options, callback)' instead");
var pageWaitForSelectorDeprecatedFn = util.deprecate(function () {}, "Deprecated 'page.waitForSelector(selector, callback, timeout)' syntax - use 'page.waitForSelector(selector, timeout, callback)' instead");
var phantomPathDeprecatedFn = util.deprecate(function () {}, "Deprecated 'phantomPath' option - use 'path' instead");


exports.create = function (phantomProcess, options, callback) {
  if (callback && Object.prototype.toString.call(options) === '[object Function]') {
    createDeprecatedFn();

    var tmp = options;

    options = callback;
    callback = tmp;
  }

  if (!callback) {
    callback = options;
    options = {};
  }

  if (typeof options.parameters === 'undefined') { options.parameters = {}; }

  function spawnPhantom (phantom, callback) {
    phantom.once('error', function (err) {
      callback(err);
    });

    phantom.stderr.on('data', function (data) {
      if (options.ignoreErrorPattern && options.ignoreErrorPattern.exec(data)) {
        return;
      }
      logger.error('' + data);
    });

    var immediateExit = function(exitCode) {
      return callback(new HeadlessError('Phantom immediately exited with: ' + exitCode));
    };

    phantom.once('exit', immediateExit);

    // Wait for 'Ready' line
    phantom.stdout.once('data', function (data) {
      // setup normal listener now
      phantom.stdout.on('data', function (data) {
        logger.debug('' + data);
      });

      var matches = data.toString().match(/Ready \[(\d+)\] \[(.+?)\]/);

      if (!matches) {
        phantom.kill();
        callback(new HeadlessError('Unexpected output from PhantomJS: ' + data));
        return;
      }

      phantom.removeListener('exit', immediateExit);

      var phantom_port = matches[2].indexOf(':') === -1 ? matches[2] : matches[2].split(':')[1];

      phantom_port = parseInt(phantom_port, 0);

      if (phantom_port !== 0) {
        callback(null, phantom, phantom_port);
        return;
      }

      var phantom_pid = parseInt(matches[1], 0);

      // Now need to figure out what port it's listening on - since
      // Phantom is busted and can't tell us this we need to use lsof on mac, and netstat on Linux
      // Note that if phantom could tell you the port it ends up listening
      // on we wouldn't need to do this - server.port returns 0 when you ask
      // for port 0 (i.e. random free port). If they ever fix that this will
      // become much simpler
      var platform = require('os').platform();
      var cmd = null;

      switch (platform) {
        case 'linux':
          // Modern distros usually have `iproute2` instead of `net-tools`.
          // Try `ss` first, then fallback to `netstat`.
          //
          // Note:
          //
          // - `grep "[,=]%d,"` contains variation, because `ss` output differs
          //    between versions.
          // - `ss` can exist but fail in some env (#76).
          //
          cmd = 'ss -nlp | grep "[,=]%d," || netstat -nlp | grep "[[:space:]]%d/"';
          break;

        case 'darwin':
          cmd = 'lsof -np %d | grep LISTEN';
          break;

        case 'win32':
          cmd = 'netstat -ano | findstr /R "\\<%d\\>"';
          break;

        case 'cygwin':
          cmd = 'netstat -ano | grep %d';
          break;

        case 'freebsd':
          cmd = 'sockstat | grep %d';
          break;

        default:
          phantom.kill();
          callback(new HeadlessError('Your OS is not supported yet. Tell us how to get the listening port based on PID'));
          return;
      }

      // We do this twice - first to get ports this process is listening on
      // and again to get ports phantom is listening on. This is to work
      // around this bug in libuv: https://github.com/joyent/libuv/issues/962
      // - this is only necessary when using cluster, but it's here regardless
      var my_pid_command = cmd.replace(/%d/g, process.pid);

      exec(my_pid_command, function (err, stdout /*, stderr*/) {
        if (err !== null) {
          // This can happen if grep finds no matching lines, so ignore it.
          stdout = '';
        }

        var re = /(?:127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost):(\d+)/ig, match;
        var ports = [];

        while ((match = re.exec(stdout)) !== null) {
          ports.push(match[1]);
        }

        var phantom_pid_command = cmd.replace(/%d/g, phantom_pid);

        exec(phantom_pid_command, function (err, stdout /*, stderr*/) {
          if (err !== null) {
            phantom.kill();
            callback(new HeadlessError('Error executing command to extract phantom ports: ' + err));
            return;
          }

          var port;

          while ((match = re.exec(stdout)) !== null) {
            if (ports.indexOf(match[1]) === -1) {
              port = match[1];
            }
          }

          if (!port) {
            phantom.kill();
            callback(new HeadlessError('Error extracting port from: ' + stdout));
            return;
          }

          callback(null, phantom, port);
        });
      });
    });
  }

  spawnPhantom(phantomProcess, function (err, phantom, port) {
    if (err) {
      callback(err);
      return;
    }

    var pages = {};

    var setup_new_page = function (id) {
      var methods = [
        'addCookie', 'childFramesCount', 'childFramesName', 'clearCookies', 'close',
        'currentFrameName', 'deleteCookie', 'evaluateJavaScript',
        'evaluateAsync', 'getPage', 'go', 'goBack', 'goForward', 'includeJs',
        'injectJs', 'open', 'openUrl', 'release', 'reload', 'render', 'renderBase64',
        'sendEvent', 'setContent', 'stop', 'switchToFocusedFrame', 'switchToFrame',
        'switchToFrame', 'switchToChildFrame', 'switchToChildFrame', 'switchToMainFrame',
        'switchToParentFrame', 'uploadFile', 'clearMemoryCache'
      ];

      var page = {
        setFn: function (name, fn, cb) {
          request_queue.push([ [ id, 'setFunction', name, fn.toString() ], callbackOrDummy(cb, poll_func) ]);
        },

        get: function (name, cb) {
          request_queue.push([ [ id, 'getProperty', name ], callbackOrDummy(cb, poll_func) ]);
        },

        set: function (name, val, cb) {
          // Special case for `paperSize.header.contents` property.
          // Property should be wrapped by `phantom.callback` in bridge.
          if (name === 'paperSize.header.contents' && val) {
            val = String(val);
          } else if (name === 'paperSize.header' && val.contents) {
            val = clone(val);
            val.contents = String(val.contents);
          } else if (name === 'paperSize' && val.header && val.header.contents) {
            val = clone(val);
            val.header.contents = String(val.header.contents);
          }

          // Special case for `paperSize.footer.contents` property.
          // Property should be wrapped by `phantom.callback` in bridge.
          if (name === 'paperSize.footer.contents' && val) {
            val = String(val);
          } else if (name === 'paperSize.footer' && val.contents) {
            val = clone(val);
            val.contents = String(val.contents);
          } else if (name === 'paperSize' && val.footer && val.footer.contents) {
            val = clone(val);
            val.footer.contents = String(val.footer.contents);
          }

          request_queue.push([ [ id, 'setProperty', name, val ], callbackOrDummy(cb, poll_func) ]);
        },

        evaluate: function (fn, cb) {
          var extra_args = [];

          if (arguments.length > 2) {
            if (Object.prototype.toString.call(arguments[arguments.length - 1]) === '[object Function]') {
              extra_args = Array.prototype.slice.call(arguments, 1, -1);
              cb = arguments[arguments.length - 1];
            } else {
              pageEvaluateDeprecatedFn();
              extra_args = Array.prototype.slice.call(arguments, 2);
            }
          }

          request_queue.push([ [ id, 'evaluate', fn.toString() ].concat(extra_args), callbackOrDummy(cb, poll_func) ]);
        },

        waitForSelector: function (selector, timeout, cb) {
          if (cb && Object.prototype.toString.call(timeout) === '[object Function]') {
            pageWaitForSelectorDeprecatedFn();

            var tmp = cb;

            cb = timeout;
            timeout = tmp;
          }

          if (!cb) {
            cb = timeout;
            // Default timeout is 10 sec
            timeout = 10000;
          }

          var startTime = Date.now();
          var timeoutInterval = 150;
          // if evaluate succeeds, invokes callback w/ true, if timeout,
          // invokes w/ false, otherwise just exits
          var testForSelector = function () {
            var elapsedTime = Date.now() - startTime;

            if (elapsedTime > timeout) {
              cb(new HeadlessError('Timeout waiting for selector: ' + selector));
              return;
            }

            /*eslint-disable handle-callback-err*/
            page.evaluate(function (selector) {
              return document.querySelectorAll(selector).length;
            }, selector, function (err, result) {
              if (result > 0) { // selector found
                cb();
              } else {
                setTimeout(testForSelector, timeoutInterval);
              }
            });
          };

          setTimeout(testForSelector, timeoutInterval);
        }
      };

      methods.forEach(function (method) {
        page[method] = function () {
          var all_args = Array.prototype.slice.call(arguments);
          var callback = null;

          if (all_args.length > 0 && typeof all_args[all_args.length - 1] === 'function') {
            callback = all_args.pop();
          }

          var req_params = [ id, method ];

          request_queue.push([ req_params.concat(all_args), callbackOrDummy(callback, poll_func) ]);
        };
      });

      pages[id] = page;

      return page;
    };

    var poll_func = setup_long_poll(phantom, port, pages, setup_new_page);

    var request_queue = queue(function (paramarr, next) {
      var params = paramarr[0];
      var callback = paramarr[1];
      var page = params[0];
      var method = params[1];
      var args = params.slice(2);

      var http_opts = {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'POST'
      };

      phantom.POSTING = true;

      var req = http.request(http_opts, function (res) {
        var err = res.statusCode === 500 ? true : false;
        var data = '';

        res.setEncoding('utf8');

        res.on('data', function (chunk) {
          data += chunk;
        });

        res.on('end', function () {
          phantom.POSTING = false;

          if (!data) {
            // If method is exit - response may be empty, because server could be stopped while sending
            if (method === 'exit') {
              next();
              callback();
              return;
            }

            next();
            callback(new HeadlessError('No response body for page.' + method + '()'));
            return;
          }

          var results;

          try {
            results = JSON.parse(data).data;
          } catch (error) {
            // If method is exit - response may be broken, because server could be stopped while sending
            if (method === 'exit') {
              next();
              callback();
              return;
            }

            next();
            callback(error);
            return;
          }

          if (err) {
            next();
            callback(results);
            return;
          }

          if (method === 'createPage') {
            var id = results.page_id;
            var page = setup_new_page(id);

            next();
            callback(null, page);
            return;
          }

          // Not createPage - just run the callback
          next();
          callback(null, results);
        });
      });

      req.on('error', function (err) {
        // If phantom already killed by `exit` command - callback without error
        if (phantom.killed) {
          next();
          callback();
          return;
        }

        logger.warn('Request() error evaluating ' + method + '() call: ' + err);
        callback(new HeadlessError('Request() error evaluating ' + method + '() call: ' + err));
      });

      req.setHeader('Content-Type', 'application/json');

      var json = JSON.stringify({ page: page, method: method, args: args });

      req.setHeader('Content-Length', Buffer.byteLength(json));
      req.write(json);
      req.end();
    });

    var proxy = {
      process: phantom,

      setProxy: function (ip, port, proxyType, user, password, callback) {
        request_queue.push([ [ 0, 'setProxy', ip, port, proxyType, user, password ], callbackOrDummy(callback, poll_func) ]);
      },

      createPage: function (callback) {
        request_queue.push([ [ 0, 'createPage' ], callbackOrDummy(callback, poll_func) ]);
      },

      injectJs: function (filename, callback) {
        request_queue.push([ [ 0, 'injectJs', filename ], callbackOrDummy(callback, poll_func) ]);
      },

      addCookie: function (cookie, callback) {
        request_queue.push([ [ 0, 'addCookie', cookie ], callbackOrDummy(callback, poll_func) ]);
      },

      clearCookies: function (callback) {
        request_queue.push([ [ 0, 'clearCookies' ], callbackOrDummy(callback, poll_func) ]);
      },

      deleteCookie: function (cookie, callback) {
        request_queue.push([ [ 0, 'deleteCookie', cookie ], callbackOrDummy(callback, poll_func) ]);
      },

      set : function (property, value, callback) {
        request_queue.push([ [ 0, 'setProperty', property, value ], callbackOrDummy(callback, poll_func) ]);
      },

      get : function (property, callback) {
        request_queue.push([ [ 0, 'getProperty', property ], callbackOrDummy(callback, poll_func) ]);
      },

      exit: function (callback) {
        phantom.kill('SIGTERM');

        // In case of SlimerJS `kill` will close only wrapper of xulrunner.
        // We should send `exit` command to process.
        request_queue.push([ [ 0, 'exit', 0 ], callbackOrDummy(callback) ]);
      },

      on: function () {
        phantom.on.apply(phantom, arguments);
      }
    };

    callback(null, proxy);
  });
};


function setup_long_poll (phantom, port, pages, setup_new_page) {
  var http_opts = {
    hostname: 'localhost',
    port: port,
    path: '/',
    method: 'GET'
  };

  var dead = false;
  phantom.once('exit', function () { dead = true; });

  var poll_func = function (cb) {
    if (dead) {
      cb(new HeadlessError('Phantom Process died'));
      return;
    }

    if (phantom.POSTING) {
      cb();
      return;
    }

    var req = http.get(http_opts, function(res) {
      res.setEncoding('utf8');
      var data = '';
      res.on('data', function (chunk) {
        data += chunk;
      });
      res.on('end', function () {
        var results;

        if (dead) {
          cb(new HeadlessError('Phantom Process died'));
          return;
        }

        try {
          results = JSON.parse(data).data;
        } catch (err) {
          logger.warn('Error parsing JSON from phantom: ' + err);
          logger.warn('Data from phantom was: ' + data);
          cb(new HeadlessError('Error parsing JSON from phantom: ' + err
            + '\nData from phantom was: ' + data));
          return;
        }

        results.forEach(function (r) {
          var new_page, callbackFunc, cb;

          if (r.page_id) {
            if (pages[r.page_id] && r.callback === 'onPageCreated') {
              new_page = setup_new_page(r.args[0]);

              if (pages[r.page_id].onPageCreated) {
                pages[r.page_id].onPageCreated(new_page);
              }

            } else if (pages[r.page_id] && pages[r.page_id][r.callback]) {
              callbackFunc = pages[r.page_id][r.callback];

              if (callbackFunc.length > 1) {
                // We use `apply` if the function is expecting multiple args
                callbackFunc.apply(pages[r.page_id], wrapArray(r.args));
              } else {
                // Old `call` behaviour is deprecated
                callbackFunc.call(pages[r.page_id], unwrapArray(r.args));
              }
            }
          } else {
            cb = callbackOrDummy(phantom[r.callback]);
            cb.apply(phantom, r.args);
          }
        });

        cb();
      });
    });

    req.on('error', function (err) {
      if (dead || phantom.killed) { return; }

      if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') {
        try {
          phantom.kill();
        } catch (e) {
          // we don't care
        }
        dead = true;
        cb(new HeadlessError('Phantom Process died'));
        return;
      }

      logger.warn('Poll Request error: ' + err);
    });
  };

  var repeater = function () {
    // If phantom already killed - stop repeat timer
    if (dead || phantom.killed) {
      return;
    }

    setTimeout(function () {
      poll_func(repeater);
    }, POLL_INTERVAL);
  };

  repeater();

  return poll_func;
}

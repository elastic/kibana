/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';
import { randomBytes } from 'crypto';
import { fromCallback } from 'bluebird';
import { transformFn } from './transform_fn';

export function PhantomDriver({ page, browser, zoom, logger }) {
  this.browser = browser;
  this.page = page;
  this.logger = logger;

  const validateInstance = () => {
    if (page === false || browser === false) throw new Error('Phantom instance is closed');
  };

  const configurePage = (pageOptions) => {
    const RESOURCE_TIMEOUT = 5000;
    return fromCallback(cb => page.set('resourceTimeout', RESOURCE_TIMEOUT, cb))
      .then(() => {
        if (zoom) return fromCallback(cb => page.set('zoomFactor', zoom, cb));
      })
      .then(() => {
        if (pageOptions.conditionalHeaders) {
          const headers = pageOptions.conditionalHeaders.headers;
          const conditions = pageOptions.conditionalHeaders.conditions;

          const escape = (str) => {
            return str
              .replace(/'/g, `\\'`)
              .replace(/\\/g, `\\\\`)
              .replace(/\r?\n/g, '\\n');
          };

          // we're using base64 encoding for any user generated values that we need to eval
          // to be sure that we're handling these properly
          const btoa = (str) => {
            return Buffer.from(str).toString('base64');
          };

          const fn = `function (requestData, networkRequest) {
            var log = function (msg) {
              if (!page.onConsoleMessage) {
                return;
              }
              page.onConsoleMessage(msg);
            };

            var parseUrl = function (url) {
              var link = document.createElement('a');
              link.href = url;
              return {
                protocol: link.protocol,
                port: link.port,
                hostname: link.hostname,
                pathname: link.pathname,
              };
            };

            var shouldUseCustomHeadersForPort = function (port) {
              if ('${escape(conditions.protocol)}' === 'http' && ${conditions.port} === 80) {
                return port === undefined || port === null || port === '' || port === '${conditions.port}';
              }

              if ('${escape(conditions.protocol)}' === 'https' && ${conditions.port} === 443) {
                return port === undefined || port === null || port === '' || port === '${conditions.port}';
              }

              return port === '${conditions.port}';
            };

            var url = parseUrl(requestData.url);
            if (
              url.hostname === '${escape(conditions.hostname)}' &&
              url.protocol === '${escape(conditions.protocol)}:' &&
              shouldUseCustomHeadersForPort(url.port) &&
              url.pathname.indexOf('${escape(conditions.basePath)}/') === 0
            ) {
              log('Using custom headers for ' + requestData.url);
              ${Object.keys(headers).map(key => `networkRequest.setHeader(atob('${btoa(key)}'), atob('${btoa(headers[key])}'));`)
    .join('\n')}
            } else {
              log('No custom headers for ' + requestData.url);
            }
          }`;
          return fromCallback(cb => page.setFn('onResourceRequested', fn, cb));
        }
      });
  };

  return {
    open(url, pageOptions) {
      validateInstance();

      return configurePage(pageOptions)
        .then(() => logger.debug('Configured page'))
        .then(() => fromCallback(cb => page.open(url, cb)))
        .then(status => {
          logger.debug(`Page opened with status ${status}`);
          if (status !== 'success') throw new Error('URL open failed. Is the server running?');
          if (pageOptions.waitForSelector) {
            return this.waitForSelector(pageOptions.waitForSelector);
          }
        });
    },

    setScrollPosition(position) {
      return fromCallback(cb => page.set('scrollPosition', position, cb));
    },

    setViewport(size) {
      return fromCallback(cb => page.set('viewportSize', size, cb));
    },

    evaluate({ fn, args }) {
      validateInstance();

      const uniqId = [
        randomBytes(6).toString('base64'),
        randomBytes(9).toString('base64'),
        randomBytes(6).toString('base64'),
      ].join('-');

      return _injectPromise(page)
        .then(() => {
          return fromCallback(cb => {
            page.evaluate(transformFn(evaluateWrapper), transformFn(fn).toString(), uniqId, args, cb);

            // The original function is passed here as a string, and eval'd in phantom's context.
            // It's then executed in phantom's context and the result is attached to a __reporting
            // property on window. Promises can be used, and the result will be handled in the next
            // block. If the original function does not return a promise, its result is passed on.
            function evaluateWrapper(userFnStr, cbIndex, origArgs) {
            // you can't pass a function to phantom, so we pass the string and eval back into a function
              let userFn;
              eval('userFn = ' + userFnStr); // eslint-disable-line no-eval

              // keep a record of the resulting execution for future calls (used when async)
              window.__reporting = window.__reporting || {};
              window.__reporting[cbIndex] = undefined;

              // used to format the response consistently
              function done(err, res) {
                if (window.__reporting[cbIndex]) {
                  return;
                }

                const isErr = err instanceof Error;
                if (isErr) {
                  const keys = Object.getOwnPropertyNames(err);
                  err = keys.reduce(function copyErr(obj, key) {
                    obj[key] = err[key];
                    return obj;
                  }, {});
                }

                return window.__reporting[cbIndex] = {
                  err: err,
                  res: res,
                };
              }

              try {
              // execute the original function
                const res = userFn.apply(this, origArgs);

                if (res && typeof res.then === 'function') {
                // handle async resolution via Promises
                  res.then((val) => {
                    done(null, val);
                  }, (err) => {
                    if (!(err instanceof Error)) {
                      err = new Error(err || 'Unspecified error');
                    }
                    done(err);
                  });
                  return '__promise__';
                } else {
                // if not given a promise, execute as sync
                  return done(null, res);
                }
              } catch (err) {
              // any error during execution should be dealt with
                return done(err);
              }
            }
          })
            .then((res) => {
              // if the response is not a promise, pass it along
              if (res !== '__promise__') {
                return res;
              }

              // promise response means async, so wait for its resolution
              return this.waitFor({
                fn: function (cbIndex) {
                  // resolves when the result object is no longer undefined
                  return !!window.__reporting[cbIndex];
                },
                args: [uniqId],
                toEqual: true,
              })
                .then(() => {
                  // once the original promise is resolved, pass along its value
                  return fromCallback(cb => {
                    page.evaluate(function (cbIndex) {
                      return window.__reporting[cbIndex];
                    }, uniqId, cb);
                  });
                });
            })
            .then((res) => {
              if (res.err) {
                // Make long/normal stack traces work
                res.err.name = res.err.name || 'Error';

                if (!res.err.stack) {
                  res.err.stack = res.err.toString();
                }

                res.err.stack.replace(/\n*$/g, '\n');

                if (res.err.stack) {
                  res.err.toString = function () {
                    return this.name + ': ' + this.message;
                  };
                }

                return Promise.reject(res.err);
              }

              return res.res;
            });
        });
    },

    wait(timeout) {
      validateInstance();

      return new Promise(resolve => setTimeout(resolve, timeout));
    },

    waitFor({ fn, args, toEqual }) {
      const INTERVAL_TIME = 250;

      if (typeof toEqual === 'undefined') return Promise.resolve();

      validateInstance();

      return new Promise((resolve, reject) => {
        const self = this;

        (function waitForCheck() {
          if (self.killed) {
            return;
          }

          return self.evaluate({ fn, args })
            .then(res => {
              if (res === toEqual) {
                return resolve();
              }

              setTimeout(waitForCheck, INTERVAL_TIME);
            })
            .catch(err => {
              reject(err);
            });
        }());
      });
    },

    waitForSelector(selector) {
      logger.debug(`PhantomDriver: waitForSelector ${selector}`);

      validateInstance();

      return this.waitFor({
        fn: function (cssSelector) {
          return !!document.querySelector(cssSelector);
        },
        args: [selector],
        toEqual: true,
      })
        .then(() => {
          logger.debug(`Finished waiting for selector ${selector}`);
        });
    },

    async screenshot(position) {
      const { boundingClientRect, scroll = { x: 0, y: 0 } } = position;

      validateInstance();

      const zoomFactor = await fromCallback(cb => page.get('zoomFactor', cb));
      const previousClipRect = await fromCallback(cb => page.get('clipRect', cb));

      const clipRect = {
        top: (boundingClientRect.top * zoomFactor) + scroll.y,
        left: (boundingClientRect.left * zoomFactor) + scroll.x,
        height: boundingClientRect.height * zoomFactor,
        width: boundingClientRect.width * zoomFactor
      };

      await fromCallback(cb => page.set('clipRect', clipRect, cb));
      const data = await fromCallback(cb => page.renderBase64('PNG', cb));

      await fromCallback(cb => page.set('clipRect', previousClipRect, cb));
      return data;
    },
  };
}


function _injectPromise(page) {
  function checkForPromise() {
    return fromCallback(cb => {
      page.evaluate(function hasPromise() {
        return (typeof window.Promise !== 'undefined');
      }, cb);
    });
  }

  return checkForPromise()
    .then(hasPromise => {
      if (hasPromise) return;

      const nodeModules = path.resolve(__dirname, '..', '..', '..', '..', '..', '..', 'node_modules');
      const promisePath = path.join(nodeModules, 'bluebird', 'js', 'browser', 'bluebird.js');
      return fromCallback(cb => page.injectJs(promisePath, cb))
        .then(status => {
          if (status !== true) {
            return Promise.reject('Failed to load Promise library');
          }
        })
        .then(checkForPromise)
        .then(hasPromiseLoaded => {
          if (hasPromiseLoaded !== true) {
            return Promise.reject('Failed to inject Promise');
          }
        });
    });
}



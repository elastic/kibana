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

  const configurePage = () => {
    const RESOURCE_TIMEOUT = 5000;
    return fromCallback(cb => page.set('resourceTimeout', RESOURCE_TIMEOUT, cb))
      .then(() => {
        if (zoom) return fromCallback(cb => page.set('zoomFactor', zoom, cb));
      });
  };

  return {
    open(url, pageOptions) {
      validateInstance();

      return configurePage()
        .then(() => logger.debug('Configured page'))
        .then(() => fromCallback(cb => page.open(url, cb)))
        .then(async (status) => {
          const { sessionCookie } =  pageOptions;
          if (sessionCookie) {
            await fromCallback(cb => page.clearCookies(cb));
            // phantom doesn't support the SameSite option for the cookie, so we aren't setting it
            await fromCallback(cb => page.addCookie({
              name: sessionCookie.name,
              value: sessionCookie.value,
              path: sessionCookie.path,
              httponly: sessionCookie.httpOnly,
              secure: sessionCookie.secure,
            }, cb));
            return await fromCallback(cb => page.open(url, cb));
          } else {
            return status;
          }
        })
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



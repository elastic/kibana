/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hapiAuthCookie from 'hapi-auth-cookie';

const HAPI_STRATEGY_NAME = 'security-cookie';
// Forbid applying of Hapi authentication strategies to routes automatically.
const HAPI_STRATEGY_MODE = false;

function assertRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error(`Request should be a valid object, was [${typeof request}].`);
  }
}

/**
 * Manages Kibana user session.
 */
export class Session {
  /**
   * HapiJS server instance.
   * @type {Object}
   * @private
   */
  _server = null;

  /**
   * Session duration in ms. If `null` session will stay active until the browser is closed.
   * @type {?number}
   * @private
   */
  _ttl = null;

  /**
   * Instantiates Session. Constructor is not supposed to be used directly. To make sure that all
   * `Session` dependencies/plugins are properly initialized one should use static `Session.create` instead.
   * @param {Hapi.Server} server HapiJS Server instance.
   */
  constructor(server) {
    this._server = server;
    this._ttl = this._server.config().get('xpack.security.sessionTimeout');
  }

  /**
   * Retrieves session value from the session storage (e.g. cookie).
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<any>}
   */
  async get(request) {
    assertRequest(request);

    return new Promise((resolve) => {
      this._server.auth.test(HAPI_STRATEGY_NAME, request, (err, session) => {
        if (Array.isArray(session)) {
          const warning = `Found ${session.length} auth sessions when we were only expecting 1.`;
          this._server.log(['warning', 'security', 'auth', 'session'], warning);
          return resolve(null);
        }

        if (err) {
          this._server.log(['debug', 'security', 'auth', 'session'], err);
        }

        resolve(err ? null : session.value);
      });
    });
  }

  /**
   * Puts current session value into the session storage.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} value Any object that will be associated with the request.
   * @returns {Promise.<void>}
   */
  async set(request, value) {
    assertRequest(request);

    request.cookieAuth.set({
      value,
      expires: this._ttl && Date.now() + this._ttl
    });
  }

  /**
   * Clears current session.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<void>}
   */
  async clear(request) {
    assertRequest(request);

    request.cookieAuth.clear();
  }

  /**
   * Prepares and creates a session instance.
   * @param {Hapi.Server} server HapiJS Server instance.
   * @returns {Promise.<Session>}
   */
  static async create(server) {
    // Register HAPI plugin that manages session cookie and delegate parsing of the session cookie to it.
    await new Promise((resolve, reject) => {
      server.register(hapiAuthCookie, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    const config =  server.config();
    server.auth.strategy(HAPI_STRATEGY_NAME, 'cookie', HAPI_STRATEGY_MODE, {
      cookie: config.get('xpack.security.cookieName'),
      password: config.get('xpack.security.encryptionKey'),
      clearInvalid: true,
      validateFunc: Session._validateCookie,
      isSecure: config.get('xpack.security.secureCookies'),
      path: `${config.get('server.basePath')}/`
    });

    return new Session(server);
  }

  /**
   * Validation function that is passed to hapi-auth-cookie plugin and is responsible
   * only for cookie expiration time validation.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} session Session value object retrieved from cookie.
   * @param {function} callback Callback to be called once validation is completed.
   * @private
   */
  static _validateCookie(request, session, callback) {
    if (session.expires && session.expires < Date.now()) {
      callback(new Error('Session has expired'), false /* isValid */);
      return;
    }

    callback(null /* error */, true /* isValid */, session);
  }
}

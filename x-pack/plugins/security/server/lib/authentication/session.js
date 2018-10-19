/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import hapiAuthCookie from 'hapi-auth-cookie';

import iron from 'iron';

const HAPI_STRATEGY_NAME = 'security-cookie';
// Forbid applying of Hapi authentication strategies to routes automatically.
const HAPI_STRATEGY_MODE = false;

function assertRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new Error(`Request should be a valid object, was [${typeof request}].`);
  }
}

/**
 * CookieOptions
 * @typedef {Object} CookieOptions
 * @property {string} name - The name of the cookie
 * @property {string} password - The password that is used to encrypt the cookie
 * @property {string} path - The path that is set for the cookie
 * @property {boolean} secure - Whether the cookie should only be sent over HTTPS
 * @property {?number} ttl - Session duration in ms. If `null` session will stay active until the browser is closed.
 */

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
   * Options for the cookie
   * @type {CookieOptions}
   * @private
   */
  _cookieOptions = null;

  /**
   * Instantiates Session. Constructor is not supposed to be used directly. To make sure that all
   * `Session` dependencies/plugins are properly initialized one should use static `Session.create` instead.
   * @param {Hapi.Server} server HapiJS Server instance.
   */
  constructor(server, cookieOptions) {
    this._server = server;
    this._cookieOptions = cookieOptions;
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
      expires: this._cookieOptions.ttl && Date.now() + this._cookieOptions.ttl
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
   * Serializes current session.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<string>}
   */
  async serialize(request) {
    const state = request._states[this._cookieOptions.name];
    if (!state) {
      return null;
    }

    const value = await new Promise((resolve, reject) => {
      iron.seal(state.value, this._cookieOptions.password, iron.defaults, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

    return value;
  }

  /**
   * Returns the options that we're using for the session cookie
   * @returns {CookieOptions}
   */
  getCookieOptions() {
    return {
      name: this._cookieOptions.name,
      path: this._cookieOptions.path,
      httpOnly: this._cookieOptions.httpOnly,
      secure: this._cookieOptions.secure,
    };
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
    const httpOnly = true;
    const name = config.get('xpack.security.cookieName');
    const password = config.get('xpack.security.encryptionKey');
    const path = `${config.get('server.basePath')}/`;
    const secure = config.get('xpack.security.secureCookies');
    const ttl = config.get(`xpack.security.sessionTimeout`);

    server.auth.strategy(HAPI_STRATEGY_NAME, 'cookie', HAPI_STRATEGY_MODE, {
      cookie: name,
      password,
      clearInvalid: true,
      validateFunc: Session._validateCookie,
      isHttpOnly: httpOnly,
      isSecure: secure,
      path: path,
    });

    return new Session(server, {
      httpOnly,
      name,
      password,
      path,
      secure,
      ttl,
    });
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

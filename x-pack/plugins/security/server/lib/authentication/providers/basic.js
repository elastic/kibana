/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { canRedirectRequest } from '../../can_redirect_request';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';

/**
 * Object that represents available provider options.
 * @typedef {{
 *  protocol: string,
 *  hostname: string,
 *  port: string,
 *  basePath: string,
 *  client: Client,
 *  log: Function
 * }} ProviderOptions
 */

/**
 * Provider that supports request authentication via Basic HTTP Authentication.
 */
export class BasicAuthenticationProvider {
  /**
   * Server options that may be needed by authentication provider.
   * @type {?ProviderOptions}
   * @protected
   */
  _options = null;

  /**
   * Instantiates BasicAuthenticationProvider.
   * @param {ProviderOptions} options Provider options object.
   */
  constructor(options) {
    this._options = options;
  }

  /**
   * Performs request authentication using Basic HTTP Authentication.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} [state] Optional state object associated with the provider.
   * @returns {Promise.<AuthenticationResult>}
   */
  async authenticate(request, state) {
    this._options.log(['debug', 'security', 'basic'], `Trying to authenticate user request to ${request.url.path}.`);

    let authenticationResult = await this._authenticateViaHeader(request);

    if (authenticationResult.notHandled() && state) {
      authenticationResult = await this._authenticateViaState(request, state);
    } else if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      // If we couldn't handle authentication let's redirect user to the login page.
      const nextURL = encodeURIComponent(`${this._options.basePath}${request.url.path}`);
      authenticationResult = AuthenticationResult.redirectTo(
        `${this._options.basePath}/login?next=${nextURL}`
      );
    }

    return authenticationResult;
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<DeauthenticationResult>}
   */
  async deauthenticate(request) {
    // Query string may contain the path where logout has been called or
    // logout reason that login page may need to know.
    return DeauthenticationResult.redirectTo(
      `${this._options.basePath}/login${request.url.search}`
    );
  }

  /**
   * Validates whether request contains `Basic ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaHeader(request) {
    this._options.log(['debug', 'security', 'basic'], 'Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this._options.log(['debug', 'security', 'basic'], 'Authorization header is not presented.');
      return AuthenticationResult.notHandled();
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'basic') {
      this._options.log(['debug', 'security', 'basic'], `Unsupported authentication schema: ${authenticationSchema}`);

      // It's essential that we fail if non-empty, but unsupported authentication schema
      // is provided to allow authenticator to consult other authentication providers
      // that may support that schema.
      return AuthenticationResult.failed(
        Boom.badRequest(`Unsupported authentication schema: ${authenticationSchema}`)
      );
    }

    try {
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'basic'], 'Request has been authenticated via header.');

      return AuthenticationResult.succeeded(user, { authorization });
    } catch(err) {
      this._options.log(['debug', 'security', 'basic'], `Failed to authenticate request via header: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to extract authorization header from the state and adds it to the request before
   * it's forwarded to Elasticsearch backend.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} state State value previously stored by the provider.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaState(request, { authorization }) {
    this._options.log(['debug', 'security', 'basic'], 'Trying to authenticate via state.');

    if (!authorization) {
      this._options.log(['debug', 'security', 'basic'], 'Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = authorization;

    try {
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'basic'], 'Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'basic'], `Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to crash if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }
}

/**
 * Utility class that knows how to decorate request with proper Basic authentication headers.
 */
export class BasicCredentials {
  /**
   * Takes provided `username` and `password`, transforms them into proper `Basic ***` authorization
   * header and decorates passed request with it.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {string} username User name.
   * @param {string} password User password.
   * @returns {Hapi.Request} HapiJS request instance decorated with the proper header.
   */
  static decorateRequest(request, username, password) {
    if (!request || typeof request !== 'object') {
      throw new Error('Request should be a valid object.');
    }

    if (!username || typeof username !== 'string') {
      throw new Error('Username should be a valid non-empty string.');
    }

    if (!password || typeof password !== 'string') {
      throw new Error('Password should be a valid non-empty string.');
    }

    const basicCredentials = new Buffer(`${username}:${password}`).toString('base64');
    request.headers.authorization = `Basic ${basicCredentials}`;
    return request;
  }
}

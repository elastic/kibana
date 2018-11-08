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
 * Checks the error returned by Elasticsearch as the result of `authenticate` call and returns `true` if request
 * has been rejected because of expired token, otherwise returns `false`.
 * @param {Object} err Error returned from Elasticsearch.
 * @returns {boolean}
 */
function isAccessTokenExpiredError(err) {
  return err.body
    && err.body.error
    && err.body.error.reason === 'token expired';
}

/**
 * Provider that supports request authentication via Basic HTTP Authentication.
 */
export class TokenAuthenticationProvider {
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
    this._options.log(['debug', 'security', 'token'], `Trying to authenticate user request to ${request.url.path}.`);

    // first try from login payload
    let authenticationResult = await this._authenticateViaLoginAttempt(request);

    // if there isn't a payload, try basic auth
    if (authenticationResult.notHandled()) {
      authenticationResult = await this._authenticateViaHeader(request);
    }

    // if we still can't attempt auth, try authenticating via state (session token)
    if (authenticationResult.notHandled()) {
      authenticationResult = await this._authenticateViaState(request, state);
      if (authenticationResult.failed() && isAccessTokenExpiredError(authenticationResult.error)) {
        authenticationResult = this._authenticateViaRefreshToken(request, state);
      }
    }

    // finally, if authentication still can not be handled for this
    // request/state combination, redirect to the login page if appropriate
    if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      const nextURL = encodeURIComponent(`${this._options.basePath}${request.url.path}`);
      return AuthenticationResult.redirectTo(
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
    this._options.log(['debug', 'security', 'token'], 'Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this._options.log(['debug', 'security', 'token'], 'Authorization header is not presented.');
      return AuthenticationResult.notHandled();
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'basic') {
      this._options.log(['debug', 'security', 'token'], `Unsupported authentication schema: ${authenticationSchema}`);

      // It's essential that we fail if non-empty, but unsupported authentication schema
      // is provided to allow authenticator to consult other authentication providers
      // that may support that schema.
      return AuthenticationResult.failed(
        Boom.badRequest(`Unsupported authentication schema: ${authenticationSchema}`)
      );
    }

    try {
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'token'], 'Request has been authenticated via header.');

      return AuthenticationResult.succeeded(user, { authorization });
    } catch(err) {
      this._options.log(['debug', 'security', 'token'], `Failed to authenticate request via header: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaLoginAttempt(request) {
    this._options.log(['debug', 'security', 'token'], 'Trying to authenticate via login attempt.');

    const credentials = request.loginAttempt.getCredentials();
    if (!credentials) {
      this._options.log(['debug', 'security', 'token'], 'Username and password not found in payload.');
      return AuthenticationResult.notHandled();
    }

    /*
    POST /_xpack/security/oauth2/token
    {
      "grant_type" : "password",
      "username" : "test_admin",
      "password" : "x-pack-test-password"
    }
    {
      "access_token" : "dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ==",
      "type" : "Bearer",
      "expires_in" : 1200,
      "refresh_token": "vLBPvmAB6KvwvJZr27cS"
    }

    Authorization: Bearer dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ==

    POST /_xpack/security/oauth2/token
    {
        "grant_type": "refresh_token",
        "refresh_token": "vLBPvmAB6KvwvJZr27cS"
    }
    {
      "access_token" : "dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ==",
      "type" : "Bearer",
      "expires_in" : 1200,
      "refresh_token": "vLBPvmAB6KvwvJZr27cS"
    }

    DELETE /_xpack/security/oauth2/token
    {
      "token" : "dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ=="
    }
    */
    request.payload = {
      ...credentials,
      grant_type: 'password',
    };

    try {
      // todo: get real endpoint name for es.js client
      const user = await this._options.client.callWithRequest(request, 'shield.token');

      this._options.log(['debug', 'security', 'token'], 'Request has been authenticated via request payload.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'token'], `Failed to authenticate request via state: ${err.message}`);

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
  async _authenticateViaState(request, { accessToken }) {
    this._options.log(['debug', 'security', 'token'], 'Trying to authenticate via state.');

    if (!accessToken) {
      this._options.log(['debug', 'security', 'token'], 'Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    /*
    POST /_xpack/security/oauth2/token
    {
      "grant_type" : "password",
      "username" : "test_admin",
      "password" : "x-pack-test-password"
    }
    {
      "access_token" : "dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ==",
      "type" : "Bearer",
      "expires_in" : 1200,
      "refresh_token": "vLBPvmAB6KvwvJZr27cS"
    }

    Authorization: Bearer dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ==

    POST /_xpack/security/oauth2/token
    {
        "grant_type": "refresh_token",
        "refresh_token": "vLBPvmAB6KvwvJZr27cS"
    }
    {
      "access_token" : "dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ==",
      "type" : "Bearer",
      "expires_in" : 1200,
      "refresh_token": "vLBPvmAB6KvwvJZr27cS"
    }

    DELETE /_xpack/security/oauth2/token
    {
      "token" : "dGhpcyBpcyBub3QgYSByZWFsIHRva2VuIGJ1dCBpdCBpcyBvbmx5IHRlc3QgZGF0YS4gZG8gbm90IHRyeSB0byByZWFkIHRva2VuIQ=="
    }
    */

    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'token'], 'Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'token'], `Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to crash if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      //delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }
}

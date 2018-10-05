/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
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
 * Provider that supports SAML request authentication.
 */
export class KerberosAuthenticationProvider {
  /**
   * Server options that may be needed by authentication provider.
   * @type {?ProviderOptions}
   * @protected
   */
  _options = null;

  /**
   * Instantiates SAMLAuthenticationProvider.
   * @param {ProviderOptions} options Provider options object.
   */
  constructor(options) {
    this._options = options;
  }

  /**
   * Performs SAML request authentication.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} [state] Optional state object associated with the provider.
   * @returns {Promise.<AuthenticationResult>}
   */
  async authenticate(request, state) {
    this._options.log(['debug', 'security', 'kerberos'], `Trying to authenticate user request to ${request.url.path}.`);

    let authenticationResult = await this._authenticateViaHeader(request);
    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this._authenticateViaState(request, state);
    }

    if (authenticationResult.notHandled()) {
      return AuthenticationResult.challenge('negotiate');
    }

    return authenticationResult;
  }

  /**
   * Validates whether request contains `Bearer ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaHeader(request) {
    this._options.log(['debug', 'security', 'kerberos'], 'Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this._options.log(['debug', 'security', 'kerberos'], 'Authorization header is not presented.');
      return AuthenticationResult.notHandled();
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'negotiate') {
      this._options.log(['debug', 'security', 'kerberos'], `Unsupported authentication schema: ${authenticationSchema}`);

      // It's essential that we fail if non-empty, but unsupported authentication schema
      // is provided to allow authenticator to consult other authentication providers
      // that may support that schema.
      return AuthenticationResult.failed(
        Boom.badRequest(`Unsupported authentication schema: ${authenticationSchema}`)
      );
    }

    try {
      const { access_token: accessToken } = await this._options.client.callWithRequest(
        request,
        'shield.getToken',
        { body: { grant_type: 'client_credentials' } }
      );

      this._options.log(['debug', 'security', 'kerberos'], 'Received accessToken using client_credentials grant.');

      request.headers.authorization = `Bearer ${accessToken}`;

      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate'
      );

      this._options.log(['debug', 'security', 'kerberos'], 'Request has been authenticated via header.');

      return AuthenticationResult.succeeded(user, {
        accessToken
      });
    } catch(err) {
      this._options.log(['debug', 'security', 'kerberos'], `Failed to authenticate request via header: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to extract access token from state and adds it to the request before it's
   * forwarded to Elasticsearch backend.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} state State value previously stored by the provider.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaState(request, { accessToken }) {
    this._options.log(['debug', 'security', 'kerberos'], 'Trying to authenticate via state.');

    if (!accessToken) {
      this._options.log(['debug', 'security', 'kerberos'], 'Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate'
      );

      this._options.log(['debug', 'security', 'kerberos'], 'Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'kerberos'], `Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      if (isAccessTokenExpiredError(err)) {
        return AuthenticationResult.challenge('negotiate');
      } else {
        return AuthenticationResult.failed(err);
      }
    }
  }

  /**
   * Invalidates SAML access token if it exists.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} state State value previously stored by the provider.
   * @returns {Promise.<DeauthenticationResult>}
   */
  async deauthenticate(request, state) {
    this._options.log(['debug', 'security', 'kerberos'], `Trying to deauthenticate user via ${request.url.path}.`);

    if ((!state || !state.accessToken)) {
      this._options.log(['debug', 'security', 'kerberos'], 'There is no access token to invalidate');
      return DeauthenticationResult.notHandled();
    }

    this._options.log(['debug', 'security', 'kerberos'], 'Logout has been initiated by the user.');
    const logoutArgs = [
      'shield.deleteToken',
      { body: { token: state.accessToken } }
    ];

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/logout (invalidate)`.
      await this._options.client.callWithInternalUser(...logoutArgs);

      this._options.log(['debug', 'security', 'kerberos'], 'User session has been successfully invalidated.');

      return DeauthenticationResult.redirectTo('/logged_out');
    } catch(err) {
      this._options.log(['debug', 'security', 'kerberos'], `Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }
}

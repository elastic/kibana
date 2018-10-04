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
 * Provider that supports SAML request authentication.
 */
export class SPNEGOAuthenticationProvider {
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
    this._options.log(['debug', 'security', 'spnego'], `Trying to authenticate user request to ${request.url.path}.`);

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
    this._options.log(['debug', 'security', 'spnego'], 'Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this._options.log(['debug', 'security', 'spnego'], 'Authorization header is not presented.');
      return AuthenticationResult.notHandled();
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'negotiate') {
      this._options.log(['debug', 'security', 'spnego'], `Unsupported authentication schema: ${authenticationSchema}`);

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

      this._options.log(['debug', 'security', 'spnego'], 'Received accessToken using client_credentials grant.');

      request.headers.authorization = `Bearer ${accessToken}`;

      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate'
      );

      this._options.log(['debug', 'security', 'spnego'], 'Request has been authenticated via header.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'spnego'], `Failed to authenticate request via header: ${err.message}`);
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
    this._options.log(['debug', 'security', 'spnego'], 'Trying to authenticate via state.');

    if (!accessToken) {
      this._options.log(['debug', 'security', 'spnego'], 'Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate'
      );

      this._options.log(['debug', 'security', 'spnego'], 'Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'spnego'], `Failed to authenticate request via state: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Invalidates SAML access token if it exists.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} state State value previously stored by the provider.
   * @returns {Promise.<DeauthenticationResult>}
   */
  async deauthenticate(request, state) {
    this._options.log(['debug', 'security', 'spnego'], `Trying to deauthenticate user via ${request.url.path}.`);

    if ((!state || !state.accessToken) && !request.query.SAMLRequest) {
      this._options.log(['debug', 'security', 'spnego'], 'There is neither access token nor SAML session to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    let logoutArgs;
    if (request.query.SAMLRequest) {
      this._options.log(['debug', 'security', 'spnego'], 'Logout has been initiated by the Identity Provider.');
      logoutArgs = [
        'shield.samlInvalidate',
        // Elasticsearch expects `queryString` without leading `?`, so we should strip it with `slice`.
        { body: { queryString: request.url.search.slice(1), acs: this._getACS() } }
      ];
    } else {
      this._options.log(['debug', 'security', 'spnego'], 'Logout has been initiated by the user.');
      logoutArgs = [
        'shield.samlLogout',
        { body: { token: state.accessToken, refresh_token: state.refreshToken } }
      ];
    }

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/logout (invalidate)`.
      const { redirect } = await this._options.client.callWithInternalUser(...logoutArgs);

      this._options.log(['debug', 'security', 'spnego'], 'User session has been successfully invalidated.');

      // Having non-null `redirect` field within logout response means that IdP
      // supports SAML Single Logout and we should redirect user to the specified
      // location to properly complete logout.
      if (redirect != null) {
        this._options.log(['debug', 'security', 'spnego'], 'Redirecting user to Identity Provider to complete logout.');
        return DeauthenticationResult.redirectTo(redirect);
      }

      return DeauthenticationResult.succeeded();
    } catch(err) {
      this._options.log(['debug', 'security', 'spnego'], `Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }
}

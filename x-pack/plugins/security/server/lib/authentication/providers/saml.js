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
 * Checks the error returned by Elasticsearch as the result of `samlRefreshAccessToken` call and returns `true` if
 * request has been rejected because of invalid refresh token (expired after 24 hours or have been used already),
 * otherwise returns `false`.
 * @param {Object} err Error returned from Elasticsearch.
 * @returns {boolean}
 */
function isInvalidRefreshTokenError(err) {
  return err.body
    && (err.body.error_description === 'token has already been refreshed'
        || err.body.error_description === 'refresh token is expired');
}

/**
 * Provider that supports SAML request authentication.
 */
export class SAMLAuthenticationProvider {
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
    this._options.log(['debug', 'security', 'saml'], `Trying to authenticate user request to ${request.url.path}.`);

    let authenticationResult = await this._authenticateViaHeader(request);
    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this._authenticateViaState(request, state);
      if (authenticationResult.failed() && isAccessTokenExpiredError(authenticationResult.error)) {
        authenticationResult = await this._authenticateViaRefreshToken(request, state);
      }
    }

    if (authenticationResult.notHandled()) {
      // Let's check if user is redirected to Kibana from IdP with valid SAMLResponse.
      authenticationResult = await this._authenticateViaPayload(request, state);
    }

    // If we couldn't authenticate by means of all methods above, let's try to
    // initiate SAML handshake, otherwise just return authentication result we have.
    return authenticationResult.notHandled()
      ? await this._authenticateViaHandshake(request)
      : authenticationResult;
  }

  /**
   * Validates whether request contains `Bearer ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaHeader(request) {
    this._options.log(['debug', 'security', 'saml'], 'Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this._options.log(['debug', 'security', 'saml'], 'Authorization header is not presented.');
      return AuthenticationResult.notHandled();
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'bearer') {
      this._options.log(['debug', 'security', 'saml'], `Unsupported authentication schema: ${authenticationSchema}`);

      // It's essential that we fail if non-empty, but unsupported authentication schema
      // is provided to allow authenticator to consult other authentication providers
      // that may support that schema.
      return AuthenticationResult.failed(
        Boom.badRequest(`Unsupported authentication schema: ${authenticationSchema}`)
      );
    }

    try {
      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate'
      );

      this._options.log(['debug', 'security', 'saml'], 'Request has been authenticated via header.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'saml'], `Failed to authenticate request via header: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Validates whether request payload contains `SAMLResponse` parameter that can be exchanged
   * to a proper access token. If state is presented and includes request id then it means
   * that login attempt has been initiated by Kibana itself and request id must be sent to
   * Elasticsearch together with corresponding `SAMLResponse`. Not having state at this stage is
   * indication of potential IdP initiated login, so we should send only `SAMLResponse` that
   * Elasticsearch will decrypt and figure out on its own if it's a legit response from IdP
   * initiated login.
   *
   * When login succeeds access token is stored in the state and user is redirected to the URL
   * that was requested before SAML handshake or to default Kibana location in case of IdP
   * initiated login.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} [state] Optional state object associated with the provider.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaPayload(request, state) {
    this._options.log(['debug', 'security', 'saml'], 'Trying to authenticate via SAML response payload.');

    if (!request.payload || !request.payload.SAMLResponse) {
      this._options.log(['debug', 'security', 'saml'], 'SAML response payload is not found.');
      return AuthenticationResult.notHandled();
    }

    // If we have a `SAMLResponse` and state, but state doesn't contain all the necessary information,
    // then something unexpected happened and we should fail.
    const { requestId: stateRequestId, nextURL: stateRedirectURL } = state || {};
    if (state && (!stateRequestId || !stateRedirectURL)) {
      const message = 'SAML response state does not have corresponding request id or redirect URL.';
      this._options.log(['debug', 'security', 'saml'], message);

      return AuthenticationResult.failed(Boom.badRequest(message));
    }

    // When we don't have state and hence request id we assume that SAMLResponse came from the IdP initiated login.
    if (stateRequestId) {
      this._options.log(['debug', 'security', 'saml'], 'Authentication has been previously initiated by Kibana.');
    } else {
      this._options.log(['debug', 'security', 'saml'], 'Authentication has been initiated by Identity Provider.');
    }

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/authenticate`.
      const {
        access_token: accessToken,
        refresh_token: refreshToken
      } = await this._options.client.callWithInternalUser(
        'shield.samlAuthenticate',
        { body: { ids: stateRequestId ? [stateRequestId] : [], content: request.payload.SAMLResponse } }
      );

      this._options.log(['debug', 'security', 'saml'], 'Request has been authenticated via SAML response.');

      return AuthenticationResult.redirectTo(
        stateRedirectURL || `${this._options.basePath}/`,
        { accessToken, refreshToken }
      );
    } catch (err) {
      this._options.log(
        ['debug', 'security', 'saml'],
        `Failed to authenticate request via SAML response: ${err.message}`
      );
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
    this._options.log(['debug', 'security', 'saml'], 'Trying to authenticate via state.');

    if (!accessToken) {
      this._options.log(['debug', 'security', 'saml'], 'Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate'
      );

      this._options.log(['debug', 'security', 'saml'], 'Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch(err) {
      this._options.log(['debug', 'security', 'saml'], `Failed to authenticate request via state: ${err.message}`);

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
   * This method is only called when authentication via access token stored in the state failed because of expired
   * token. So we should use refresh token, that is also stored in the state, to extend expired access token and
   * authenticate user with it.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} state State value previously stored by the provider.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaRefreshToken(request, { refreshToken }) {
    this._options.log(['debug', 'security', 'saml'], 'Trying to refresh access token.');

    if (!refreshToken) {
      this._options.log(['debug', 'security', 'saml'], 'Refresh token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    try {
      // Token should be refreshed by the same user that obtained that token.
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      } = await this._options.client.callWithInternalUser(
        'shield.samlRefreshAccessToken',
        { body: { grant_type: 'refresh_token', refresh_token: refreshToken } }
      );

      this._options.log(['debug', 'security', 'saml'], 'Access token has been successfully refreshed.');

      request.headers.authorization = `Bearer ${newAccessToken}`;

      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'saml'], 'Request has been authenticated via refreshed token.');

      return AuthenticationResult.succeeded(
        user,
        { accessToken: newAccessToken, refreshToken: newRefreshToken }
      );
    } catch (err) {
      this._options.log(['debug', 'security', 'saml'], `Failed to refresh access token: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      // There are at least two common cases when refresh token request can fail:
      // 1. Refresh token is valid only for 24 hours and if it hasn't been used it expires.
      //
      // 2. Refresh token is one-time use token and if it has been used already, it is treated in the same way as
      // expired token. Even though it's an edge case, there are several perfectly valid scenarios when it can
      // happen. E.g. when several simultaneous AJAX request has been sent to Kibana, but access token has expired
      // already, so the first request that reaches Kibana uses refresh token to get a new access token, but the
      // second concurrent request has no idea about that and tries to refresh access token as well. All ends well
      // when first request refreshes access token and updates session cookie with fresh access/refresh token pair.
      // But if user navigates to another page _before_ AJAX request (the one that triggered token refresh) responds
      // with updated cookie, then user will have only that old cookie with expired access token and refresh token
      // that has been used already.
      //
      // When user has neither valid access nor refresh token, the only way to resolve this issue is to get new
      // SAML LoginResponse and exchange it for a new access/refresh token pair. To do that we initiate a new SAML
      // handshake. Obviously we can't do that for AJAX requests, so we just reply with `400` and clear error message.
      // There are two reasons for `400` and not `401`: Elasticsearch search responds with `400` so it seems logical
      // to do the same on Kibana side and `401` would force user to logout and do full SLO if it's supported.
      if (isInvalidRefreshTokenError(err)) {
        if (canRedirectRequest(request)) {
          this._options.log(
            ['debug', 'security', 'saml'],
            'Both access and refresh tokens are expired. Re-initiating SAML handshake.'
          );
          return this._authenticateViaHandshake(request);
        }

        return AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'));
      }

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to start SAML handshake and eventually receive a token.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaHandshake(request) {
    this._options.log(['debug', 'security', 'saml'], 'Trying to initiate SAML handshake.');

    // If client can't handle redirect response, we shouldn't initiate SAML handshake.
    if (!canRedirectRequest(request)) {
      this._options.log(['debug', 'security', 'saml'], 'SAML handshake can not be initiated by AJAX requests.');
      return AuthenticationResult.notHandled();
    }

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/prepare`.
      const { id: requestId, redirect } = await this._options.client.callWithInternalUser(
        'shield.samlPrepare',
        { body: { acs: this._getACS() } }
      );

      this._options.log(['debug', 'security', 'saml'], 'Redirecting to Identity Provider with SAML request.');

      return AuthenticationResult.redirectTo(
        redirect,
        // Store request id in the state so that we can reuse it once we receive `SAMLResponse`.
        { requestId, nextURL: `${this._options.basePath}${request.url.path}` }
      );
    } catch (err) {
      this._options.log(['debug', 'security', 'saml'], `Failed to initiate SAML handshake: ${err.message}`);
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
    this._options.log(['debug', 'security', 'saml'], `Trying to deauthenticate user via ${request.url.path}.`);

    if ((!state || !state.accessToken) && !request.query.SAMLRequest) {
      this._options.log(['debug', 'security', 'saml'], 'There is neither access token nor SAML session to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    let logoutArgs;
    if (request.query.SAMLRequest) {
      this._options.log(['debug', 'security', 'saml'], 'Logout has been initiated by the Identity Provider.');
      logoutArgs = [
        'shield.samlInvalidate',
        // Elasticsearch expects `queryString` without leading `?`, so we should strip it with `slice`.
        { body: { queryString: request.url.search.slice(1), acs: this._getACS() } }
      ];
    } else {
      this._options.log(['debug', 'security', 'saml'], 'Logout has been initiated by the user.');
      logoutArgs = [
        'shield.samlLogout',
        { body: { token: state.accessToken, refresh_token: state.refreshToken } }
      ];
    }

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/logout (invalidate)`.
      const { redirect } = await this._options.client.callWithInternalUser(...logoutArgs);

      this._options.log(['debug', 'security', 'saml'], 'User session has been successfully invalidated.');

      // Having non-null `redirect` field within logout response means that IdP
      // supports SAML Single Logout and we should redirect user to the specified
      // location to properly complete logout.
      if (redirect != null) {
        this._options.log(['debug', 'security', 'saml'], 'Redirecting user to Identity Provider to complete logout.');
        return DeauthenticationResult.redirectTo(redirect);
      }

      return DeauthenticationResult.succeeded();
    } catch(err) {
      this._options.log(['debug', 'security', 'saml'], `Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }

  /**
   * Constructs and returns Kibana's Assertion consumer service URL.
   * @returns {string}
   * @private
   */
  _getACS() {
    return `${this._options.protocol}://${this._options.hostname}:${this._options.port}` +
      `${this._options.basePath}/api/security/v1/saml`;
  }
}

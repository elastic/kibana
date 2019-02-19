/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { canRedirectRequest } from '../../can_redirect_request';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';

/**
 * Object that represents available provider options.
 * @typedef {{
 *  basePath: string,
 *  client: Client,
 *  log: Function
 * }} ProviderOptions
 */

/**
 * Object that represents return value of internal header auth
 * @typedef {{
 *  authenticationResult: AuthenticationResult,
 *  headerNotRecognized?: boolean
 * }} HeaderAuthAttempt
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
 * Provider that supports token-based request authentication.
 */
export class TokenAuthenticationProvider {
  /**
   * Server options that may be needed by authentication provider.
   * @type {?ProviderOptions}
   * @protected
   */
  _options = null;

  /**
   * Instantiates TokenAuthenticationProvider.
   * @param {ProviderOptions} options Provider options object.
   */
  constructor(options) {
    this._options = options;
  }

  /**
   * Performs token-based request authentication
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} [state] Optional state object associated with the provider.
   * @returns {Promise.<AuthenticationResult>}
   */
  async authenticate(request, state) {
    this._options.log(['debug', 'security', 'token'], `Trying to authenticate user request to ${request.url.path}.`);

    // first try from login payload
    let authenticationResult = await this._authenticateViaLoginAttempt(request);

    // if there isn't a payload, try header-based token auth
    if (authenticationResult.notHandled()) {
      const {
        authenticationResult: headerAuthResult,
        headerNotRecognized,
      } = await this._authenticateViaHeader(request);
      if (headerNotRecognized) {
        return headerAuthResult;
      }
      authenticationResult = headerAuthResult;
    }

    // if we still can't attempt auth, try authenticating via state (session token)
    if (authenticationResult.notHandled() && state) {
      authenticationResult = await this._authenticateViaState(request, state);
      if (authenticationResult.failed() && isAccessTokenExpiredError(authenticationResult.error)) {
        authenticationResult = await this._authenticateViaRefreshToken(request, state);
      }
    }

    // finally, if authentication still can not be handled for this
    // request/state combination, redirect to the login page if appropriate
    if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      const nextURL = encodeURIComponent(`${request.getBasePath()}${request.url.path}`);
      authenticationResult = AuthenticationResult.redirectTo(
        `${this._options.basePath}/login?next=${nextURL}`
      );
    }

    return authenticationResult;
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param {Hapi.Request} request HapiJS request instance.
   * @param {Object} state State value previously stored by the provider.
   * @returns {Promise.<DeauthenticationResult>}
   */
  async deauthenticate(request, state) {
    this._options.log(['debug', 'security', 'token'], `Trying to deauthenticate user via ${request.url.path}.`);

    if (!state || !state.accessToken || !state.refreshToken) {
      this._options.log(['debug', 'security', 'token'], 'There are no access and refresh tokens to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    this._options.log(['debug', 'security', 'token'], 'Token-based logout has been initiated by the user.');


    try {
      // First invalidate the access token.
      const { invalidated_tokens: invalidatedAccessTokensCount } = await this._options.client.callWithInternalUser(
        'shield.deleteAccessToken',
        { body: { token: state.accessToken } }
      );

      if (invalidatedAccessTokensCount === 0) {
        this._options.log(['debug', 'security', 'token'], 'User access token was already invalidated.');
      } else if (invalidatedAccessTokensCount === 1) {
        this._options.log(['debug', 'security', 'token'], 'User access token has been successfully invalidated.');
      } else {
        this._options.log(['debug', 'security', 'token'],
          `${invalidatedAccessTokensCount} user access tokens were invalidated, this is unexpected.`
        );
      }

      // Then invalidate the refresh token.
      const { invalidated_tokens: invalidatedRefreshTokensCount } = await this._options.client.callWithInternalUser(
        'shield.deleteAccessToken',
        { body: { refresh_token: state.refreshToken } }
      );

      if (invalidatedRefreshTokensCount === 0) {
        this._options.log(['debug', 'security', 'token'], 'User refresh token was already invalidated.');
      } else if (invalidatedRefreshTokensCount === 1) {
        this._options.log(['debug', 'security', 'token'], 'User refresh token has been successfully invalidated.');
      } else {
        this._options.log(['debug', 'security', 'token'],
          `${invalidatedRefreshTokensCount} user refresh tokens were invalidated, this is unexpected.`
        );
      }

      return DeauthenticationResult.redirectTo(
        `${this._options.basePath}/login${request.url.search || ''}`
      );
    } catch(err) {
      this._options.log(['debug', 'security', 'token'], `Failed invalidating user's access token: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }

  /**
   * Validates whether request contains `Bearer ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<HeaderAuthAttempt>}
   * @private
   */
  async _authenticateViaHeader(request) {
    this._options.log(['debug', 'security', 'token'], 'Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this._options.log(['debug', 'security', 'token'], 'Authorization header is not presented.');
      return {
        authenticationResult: AuthenticationResult.notHandled()
      };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'bearer') {
      this._options.log(['debug', 'security', 'token'], `Unsupported authentication schema: ${authenticationSchema}`);
      return {
        authenticationResult: AuthenticationResult.notHandled(),
        headerNotRecognized: true
      };
    }

    try {
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'token'], 'Request has been authenticated via header.');

      // We intentionally do not store anything in session state because token
      // header auth can only be used on a request by request basis.
      return {
        authenticationResult: AuthenticationResult.succeeded(user)
      };
    } catch(err) {
      this._options.log(['debug', 'security', 'token'], `Failed to authenticate request via header: ${err.message}`);
      return {
        authenticationResult: AuthenticationResult.failed(err)
      };
    }
  }

  /**
   * @param {Hapi.Request} request HapiJS request instance.
   * @returns {Promise.<AuthenticationResult>}
   * @private
   */
  async _authenticateViaLoginAttempt(request) {
    this._options.log(['debug', 'security', 'token'], 'Trying to authenticate via login attempt.');

    const credentials = request.loginAttempt().getCredentials();
    if (!credentials) {
      this._options.log(['debug', 'security', 'token'], 'Username and password not found in payload.');
      return AuthenticationResult.notHandled();
    }

    try {
      // First attempt to exchange login credentials for an access token
      const { username, password } = credentials;
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this._options.client.callWithInternalUser(
        'shield.getAccessToken',
        { body: { grant_type: 'password', username, password } }
      );

      this._options.log(['debug', 'security', 'token'], 'Get token API request to Elasticsearch successful');

      // We validate that both access and refresh tokens exist in the response
      // so other private methods in this class can rely on them both existing.
      if (!accessToken) {
        throw new Error('Unexpected response from get token API - no access token present');
      }
      if (!refreshToken) {
        throw new Error('Unexpected response from get token API - no refresh token present');
      }

      // Then attempt to query for the user details using the new token
      request.headers.authorization = `Bearer ${accessToken}`;
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'token'], 'User has been authenticated with new access token');

      return AuthenticationResult.succeeded(user, { accessToken, refreshToken });
    } catch(err) {
      this._options.log(['debug', 'security', 'token'], `Failed to authenticate request via login attempt: ${err.message}`);

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

    try {
      request.headers.authorization = `Bearer ${accessToken}`;
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
    this._options.log(['debug', 'security', 'token'], 'Trying to refresh access token.');

    if (!refreshToken) {
      this._options.log(['debug', 'security', 'token'], 'Refresh token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    try {
      // Token must be refreshed by the same user that obtained that token, the
      // kibana system user.
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken
      } = await this._options.client.callWithInternalUser(
        'shield.getAccessToken',
        { body: { grant_type: 'refresh_token', refresh_token: refreshToken } }
      );

      this._options.log(['debug', 'security', 'token'], `Request to refresh token via Elasticsearch's get token API successful`);

      // We validate that both access and refresh tokens exist in the response
      // so other private methods in this class can rely on them both existing.
      if (!newAccessToken) {
        throw new Error('Unexpected response from get token API - no access token present');
      }
      if (!newRefreshToken) {
        throw new Error('Unexpected response from get token API - no refresh token present');
      }

      request.headers.authorization = `Bearer ${newAccessToken}`;
      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this._options.log(['debug', 'security', 'token'], 'Request has been authenticated via refreshed token.');

      return AuthenticationResult.succeeded(
        user,
        { accessToken: newAccessToken, refreshToken: newRefreshToken }
      );
    } catch (err) {
      this._options.log(['debug', 'security', 'token'], `Failed to refresh access token: ${err.message}`);

      // Reset `Authorization` header we've just set. We know for sure that it hasn't been defined before,
      // otherwise it would have been used or completely rejected by the `authenticateViaHeader`.
      // We can't just set `authorization` to `undefined` or `null`, we should remove this property
      // entirely, otherwise `authorization` header without value will cause `callWithRequest` to fail if
      // it's called with this request once again down the line (e.g. in the next authentication provider).
      delete request.headers.authorization;

      return AuthenticationResult.failed(err);
    }
  }
}

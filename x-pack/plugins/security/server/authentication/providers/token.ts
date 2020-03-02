/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { KibanaRequest } from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { getHTTPAuthenticationScheme } from '../get_http_authentication_scheme';
import { Tokens, TokenPair } from '../tokens';
import { BaseAuthenticationProvider } from './base';

/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
interface ProviderLoginAttempt {
  username: string;
  password: string;
}

/**
 * The state supported by the provider.
 */
type ProviderState = TokenPair;

/**
 * Provider that supports token-based request authentication.
 */
export class TokenAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type = 'token';

  /**
   * Performs initial login request using username and password.
   * @param request Request instance.
   * @param attempt User credentials.
   * @param [state] Optional state object associated with the provider.
   */
  public async login(
    request: KibanaRequest,
    { username, password }: ProviderLoginAttempt,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to perform a login.');

    try {
      // First attempt to exchange login credentials for an access token
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this.options.client.callAsInternalUser('shield.getAccessToken', {
        body: { grant_type: 'password', username, password },
      });

      this.logger.debug('Get token API request to Elasticsearch successful');

      // Then attempt to query for the user details using the new token
      const authHeaders = { authorization: `Bearer ${accessToken}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Login has been successfully performed.');
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        state: { accessToken, refreshToken },
      });
    } catch (err) {
      this.logger.debug(`Failed to perform a login: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Performs token-based request authentication
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to authenticate user request to ${request.url.path}.`);

    if (getHTTPAuthenticationScheme(request) != null) {
      this.logger.debug('Cannot authenticate requests with `Authorization` header.');
      return AuthenticationResult.notHandled();
    }

    let authenticationResult = AuthenticationResult.notHandled();
    if (state) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (
        authenticationResult.failed() &&
        Tokens.isAccessTokenExpiredError(authenticationResult.error)
      ) {
        authenticationResult = await this.authenticateViaRefreshToken(request, state);
      }
    }

    // finally, if authentication still can not be handled for this
    // request/state combination, redirect to the login page if appropriate
    if (authenticationResult.notHandled() && canRedirectRequest(request)) {
      this.logger.debug('Redirecting request to Login page.');
      authenticationResult = AuthenticationResult.redirectTo(this.getLoginPageURL(request));
    }

    return authenticationResult;
  }

  /**
   * Redirects user to the login page preserving query string parameters.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to log user out via ${request.url.path}.`);

    if (state) {
      this.logger.debug('Token-based logout has been initiated by the user.');
      try {
        await this.options.tokens.invalidate(state);
      } catch (err) {
        this.logger.debug(`Failed invalidating user's access token: ${err.message}`);
        return DeauthenticationResult.failed(err);
      }
    } else {
      this.logger.debug('There are no access and refresh tokens to invalidate.');
    }

    const queryString = request.url.search || `?msg=LOGGED_OUT`;
    return DeauthenticationResult.redirectTo(
      `${this.options.basePath.get(request)}/login${queryString}`
    );
  }

  /**
   * Returns HTTP authentication scheme (`Bearer`) that's used within `Authorization` HTTP header
   * that provider attaches to all successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return 'bearer';
  }

  /**
   * Tries to extract authorization header from the state and adds it to the request before
   * it's forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(request: KibanaRequest, { accessToken }: ProviderState) {
    this.logger.debug('Trying to authenticate via state.');

    try {
      const authHeaders = { authorization: `Bearer ${accessToken}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via state.');
      return AuthenticationResult.succeeded(user, { authHeaders });
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via state: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * This method is only called when authentication via access token stored in the state failed because of expired
   * token. So we should use refresh token, that is also stored in the state, to extend expired access token and
   * authenticate user with it.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaRefreshToken(
    request: KibanaRequest,
    { refreshToken }: ProviderState
  ) {
    this.logger.debug('Trying to refresh access token.');

    let refreshedTokenPair: TokenPair | null;
    try {
      refreshedTokenPair = await this.options.tokens.refresh(refreshToken);
    } catch (err) {
      return AuthenticationResult.failed(err);
    }

    // If refresh token is no longer valid, then we should clear session and redirect user to the
    // login page to re-authenticate, or fail if redirect isn't possible.
    if (refreshedTokenPair === null) {
      if (canRedirectRequest(request)) {
        this.logger.debug('Clearing session since both access and refresh tokens are expired.');

        // Set state to `null` to let `Authenticator` know that we want to clear current session.
        return AuthenticationResult.redirectTo(this.getLoginPageURL(request), { state: null });
      }

      return AuthenticationResult.failed(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    }

    try {
      const authHeaders = { authorization: `Bearer ${refreshedTokenPair.accessToken}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via refreshed token.');
      return AuthenticationResult.succeeded(user, { authHeaders, state: refreshedTokenPair });
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate user using newly refreshed access token: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Constructs login page URL using current url path as `next` query string parameter.
   * @param request Request instance.
   */
  private getLoginPageURL(request: KibanaRequest) {
    const nextURL = encodeURIComponent(`${this.options.basePath.get(request)}${request.url.path}`);
    return `${this.options.basePath.get(request)}/login?next=${nextURL}`;
  }
}

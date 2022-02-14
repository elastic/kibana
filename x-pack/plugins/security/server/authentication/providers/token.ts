/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest } from 'src/core/server';

import { NEXT_URL_QUERY_STRING_PARAMETER } from '../../../common/constants';
import type { AuthenticationInfo } from '../../elasticsearch';
import { getDetailedErrorMessage } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { DeauthenticationResult } from '../deauthentication_result';
import { HTTPAuthorizationHeader } from '../http_authentication';
import type { RefreshTokenResult, TokenPair } from '../tokens';
import { Tokens } from '../tokens';
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
 * Checks whether current request can initiate new session.
 * @param request Request instance.
 */
function canStartNewSession(request: KibanaRequest) {
  // We should try to establish new session only if request requires authentication and client
  // can be redirected to the login page where they can enter username and password.
  return canRedirectRequest(request) && request.route.options.authRequired === true;
}

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
        authentication: authenticationInfo,
      } = await this.options.client.asInternalUser.security.getToken({
        body: {
          grant_type: 'password',
          username,
          password,
        },
      });

      this.logger.debug('Get token API request to Elasticsearch successful');
      return AuthenticationResult.succeeded(
        this.authenticationInfoToAuthenticatedUser(
          // @ts-expect-error @elastic/elasticsearch metadata defined as Record<string, any>;
          authenticationInfo as AuthenticationInfo
        ),
        {
          authHeaders: {
            authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString(),
          },
          state: { accessToken, refreshToken },
        }
      );
    } catch (err) {
      this.logger.debug(`Failed to perform a login: ${getDetailedErrorMessage(err)}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Performs token-based request authentication
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(
      `Trying to authenticate user request to ${request.url.pathname}${request.url.search}.`
    );

    if (HTTPAuthorizationHeader.parseFromRequest(request) != null) {
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
    if (authenticationResult.notHandled() && canStartNewSession(request)) {
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
    this.logger.debug(`Trying to log user out via ${request.url.pathname}${request.url.search}.`);

    // Having a `null` state means that provider was specifically called to do a logout, but when
    // session isn't defined then provider is just being probed whether or not it can perform logout.
    if (state === undefined) {
      this.logger.debug('There are no access and refresh tokens to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    this.logger.debug('Token-based logout has been initiated by the user.');
    if (state) {
      try {
        await this.options.tokens.invalidate(state);
      } catch (err) {
        this.logger.debug(`Failed invalidating user's access token: ${err.message}`);
        return DeauthenticationResult.failed(err);
      }
    }

    return DeauthenticationResult.redirectTo(this.options.urls.loggedOut(request));
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
      const authHeaders = {
        authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString(),
      };
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
  private async authenticateViaRefreshToken(request: KibanaRequest, state: ProviderState) {
    this.logger.debug('Trying to refresh access token.');

    let refreshTokenResult: RefreshTokenResult | null;
    try {
      refreshTokenResult = await this.options.tokens.refresh(state.refreshToken);
    } catch (err) {
      return AuthenticationResult.failed(err);
    }

    // If refresh token is no longer valid, then we should clear session and redirect user to the
    // login page to re-authenticate, or fail if redirect isn't possible.
    if (refreshTokenResult === null) {
      if (canStartNewSession(request)) {
        this.logger.debug('Clearing session since both access and refresh tokens are expired.');

        // Set state to `null` to let `Authenticator` know that we want to clear current session.
        return AuthenticationResult.redirectTo(this.getLoginPageURL(request), { state: null });
      }

      return AuthenticationResult.failed(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    }

    this.logger.debug('Request has been authenticated via refreshed token.');
    const { accessToken, refreshToken, authenticationInfo } = refreshTokenResult;
    return AuthenticationResult.succeeded(
      this.authenticationInfoToAuthenticatedUser(authenticationInfo),
      {
        authHeaders: {
          authorization: new HTTPAuthorizationHeader('Bearer', accessToken).toString(),
        },
        state: { accessToken, refreshToken },
      }
    );
  }

  /**
   * Constructs login page URL using current url path as `next` query string parameter.
   * @param request Request instance.
   */
  private getLoginPageURL(request: KibanaRequest) {
    const nextURL = encodeURIComponent(
      `${this.options.basePath.get(request)}${request.url.pathname}${request.url.search}`
    );
    return `${this.options.basePath.get(
      request
    )}/login?${NEXT_URL_QUERY_STRING_PARAMETER}=${nextURL}`;
  }
}

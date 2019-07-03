/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get } from 'lodash';
import { KibanaRequest } from '../../../../../../src/core/server';
import { getErrorStatusCode } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { BaseAuthenticationProvider } from './base';
import { Tokens, TokenPair } from '../tokens';

/**
 * The state supported by the provider.
 */
type ProviderState = TokenPair;

/**
 * Parses request's `Authorization` HTTP header if present and extracts authentication scheme.
 * @param request Request instance to extract authentication scheme for.
 */
function getRequestAuthenticationScheme(request: KibanaRequest) {
  const authorization = request.headers.authorization;
  if (!authorization || typeof authorization !== 'string') {
    return '';
  }

  return authorization.split(/\s+/)[0].toLowerCase();
}

/**
 * Provider that supports Kerberos request authentication.
 */
export class KerberosAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Performs Kerberos request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to authenticate user request to ${request.url.path}.`);

    const authenticationScheme = getRequestAuthenticationScheme(request);
    if (
      authenticationScheme &&
      (authenticationScheme !== 'negotiate' && authenticationScheme !== 'bearer')
    ) {
      this.logger.debug(`Unsupported authentication scheme: ${authenticationScheme}`);
      return AuthenticationResult.notHandled();
    }

    let authenticationResult = AuthenticationResult.notHandled();
    if (authenticationScheme) {
      // We should get rid of `Bearer` scheme support as soon as Reporting doesn't need it anymore.
      authenticationResult =
        authenticationScheme === 'bearer'
          ? await this.authenticateWithBearerScheme(request)
          : await this.authenticateWithNegotiateScheme(request);
    }

    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (
        authenticationResult.failed() &&
        Tokens.isAccessTokenExpiredError(authenticationResult.error)
      ) {
        authenticationResult = await this.authenticateViaRefreshToken(request, state);
      }
    }

    // If we couldn't authenticate by means of all methods above, let's try to check if Elasticsearch can
    // start authentication mechanism negotiation, otherwise just return authentication result we have.
    return authenticationResult.notHandled()
      ? await this.authenticateViaSPNEGO(request, state)
      : authenticationResult;
  }

  /**
   * Invalidates access token retrieved in exchange for SPNEGO token if it exists.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to log user out via ${request.url.path}.`);

    if (!state) {
      this.logger.debug('There is no access token invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      await this.options.tokens.invalidate(state);
    } catch (err) {
      this.logger.debug(`Failed invalidating access and/or refresh tokens: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }

    return DeauthenticationResult.redirectTo('/logged_out');
  }

  /**
   * Tries to authenticate request with `Negotiate ***` Authorization header by passing it to the Elasticsearch backend to
   * get an access token in exchange.
   * @param request Request instance.
   */
  private async authenticateWithNegotiateScheme(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate request using "Negotiate" authentication scheme.');

    const [, kerberosTicket] = (request.headers.authorization as string).split(/\s+/);

    // First attempt to exchange SPNEGO token for an access token.
    let tokens: { access_token: string; refresh_token: string };
    try {
      tokens = await this.options.client.callAsInternalUser('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: kerberosTicket },
      });
    } catch (err) {
      this.logger.debug(`Failed to exchange SPNEGO token for an access token: ${err.message}`);
      return AuthenticationResult.failed(err);
    }

    this.logger.debug('Get token API request to Elasticsearch successful');

    try {
      // Then attempt to query for the user details using the new token
      const authHeaders = { authorization: `Bearer ${tokens.access_token}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('User has been authenticated with new access token');
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        state: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token },
      });
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via access token: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to authenticate request with `Bearer ***` Authorization header by passing it to the Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateWithBearerScheme(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate request using "Bearer" authentication scheme.');

    try {
      const user = await this.getUser(request);

      this.logger.debug('Request has been authenticated using "Bearer" authentication scheme.');
      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate request using "Bearer" authentication scheme: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to extract access token from state and adds it to the request before it's
   * forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(request: KibanaRequest, { accessToken }: ProviderState) {
    this.logger.debug('Trying to authenticate via state.');

    if (!accessToken) {
      this.logger.debug('Access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

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
  private async authenticateViaRefreshToken(request: KibanaRequest, state: ProviderState) {
    this.logger.debug('Trying to refresh access token.');

    let refreshedTokenPair: TokenPair | null;
    try {
      refreshedTokenPair = await this.options.tokens.refresh(state.refreshToken);
    } catch (err) {
      return AuthenticationResult.failed(err);
    }

    // If refresh token is no longer valid, then we should clear session and renegotiate using SPNEGO.
    if (refreshedTokenPair === null) {
      this.logger.debug(
        'Both access and refresh tokens are expired. Re-initiating SPNEGO handshake.'
      );
      return this.authenticateViaSPNEGO(request, state);
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
   * Tries to query Elasticsearch and see if we can rely on SPNEGO to authenticate user.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  private async authenticateViaSPNEGO(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug('Trying to authenticate request via SPNEGO.');

    // Try to authenticate current request with Elasticsearch to see whether it supports SPNEGO.
    let authenticationError: Error;
    try {
      await this.getUser(request);
      this.logger.debug('Request was not supposed to be authenticated, ignoring result.');
      return AuthenticationResult.notHandled();
    } catch (err) {
      // Fail immediately if we get unexpected error (e.g. ES isn't available). We should not touch
      // session cookie in this case.
      if (getErrorStatusCode(err) !== 401) {
        return AuthenticationResult.failed(err);
      }

      authenticationError = err;
    }

    const challenges = ([] as string[]).concat(
      get<string | string[]>(authenticationError, 'output.headers[WWW-Authenticate]') || ''
    );

    if (challenges.some(challenge => challenge.toLowerCase() === 'negotiate')) {
      this.logger.debug(`SPNEGO is supported by the backend, challenges are: [${challenges}].`);
      return AuthenticationResult.failed(Boom.unauthorized(), ['Negotiate']);
    }

    this.logger.debug(`SPNEGO is not supported by the backend, challenges are: [${challenges}].`);

    // If we failed to do SPNEGO and have a session with expired token that belongs to Kerberos
    // authentication provider then it means Elasticsearch isn't configured to use Kerberos anymore.
    // In this case we should reply with the `401` error and allow Authenticator to clear the cookie.
    // Otherwise give a chance to the next authentication provider to authenticate request.
    return state
      ? AuthenticationResult.failed(Boom.unauthorized())
      : AuthenticationResult.notHandled();
  }
}

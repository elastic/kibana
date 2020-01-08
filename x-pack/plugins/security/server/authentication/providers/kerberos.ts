/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  ElasticsearchError,
  ElasticsearchErrorHelpers,
  KibanaRequest,
} from '../../../../../../src/core/server';
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
 * Name of the `WWW-Authenticate` we parse out of Elasticsearch responses or/and return to the
 * client to initiate or continue negotiation.
 */
const WWWAuthenticateHeaderName = 'WWW-Authenticate';

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
      authenticationScheme !== 'negotiate' &&
      authenticationScheme !== 'bearer'
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

    return DeauthenticationResult.redirectTo(`${this.options.basePath.serverBasePath}/logged_out`);
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
    let tokens: {
      access_token: string;
      refresh_token: string;
      kerberos_authentication_response_token?: string;
    };
    try {
      tokens = await this.options.client.callAsInternalUser('shield.getAccessToken', {
        body: { grant_type: '_kerberos', kerberos_ticket: kerberosTicket },
      });
    } catch (err) {
      this.logger.debug(`Failed to exchange SPNEGO token for an access token: ${err.message}`);

      // Check if SPNEGO context wasn't established and we have a response token to return to the client.
      const challenge = ElasticsearchErrorHelpers.isNotAuthorizedError(err)
        ? this.getNegotiateChallenge(err)
        : undefined;
      if (!challenge) {
        return AuthenticationResult.failed(err);
      }

      const challengeParts = challenge.split(/\s+/);
      if (challengeParts.length > 2) {
        this.logger.debug('Challenge consists of more than two parts and may be malformed.');
      }

      let responseChallenge;
      const [, responseToken] = challengeParts;
      if (responseToken) {
        this.logger.debug(
          'Returning response token to the client and continuing SPNEGO handshake.'
        );
        responseChallenge = `Negotiate ${responseToken}`;
      } else {
        this.logger.debug('Re-initiating SPNEGO handshake.');
        responseChallenge = 'Negotiate';
      }

      return AuthenticationResult.failed(Boom.unauthorized(), {
        authResponseHeaders: { [WWWAuthenticateHeaderName]: responseChallenge },
      });
    }

    this.logger.debug('Get token API request to Elasticsearch successful');

    // There is a chance we may need to provide an output token for the client (usually for mutual
    // authentication), it should be attached to the response within `WWW-Authenticate` header with
    // the requested payload, no matter what status code it may have.
    let authResponseHeaders: AuthenticationResult['authResponseHeaders'] | undefined;
    if (tokens.kerberos_authentication_response_token) {
      this.logger.debug(
        'There is an output token provided that will be included into response headers.'
      );

      authResponseHeaders = {
        [WWWAuthenticateHeaderName]: `Negotiate ${tokens.kerberos_authentication_response_token}`,
      };
    }

    try {
      // Then attempt to query for the user details using the new token
      const authHeaders = { authorization: `Bearer ${tokens.access_token}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('User has been authenticated with new access token');
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        authResponseHeaders,
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
    let elasticsearchError: ElasticsearchError;
    try {
      await this.getUser(request, {
        // We should send a fake SPNEGO token to Elasticsearch to make sure Kerberos realm is included
        // into authentication chain and adds a `WWW-Authenticate: Negotiate` header to the error
        // response. Otherwise it may not be even consulted if request can be authenticated by other
        // means (e.g. when anonymous access is enabled in Elasticsearch).
        authorization: `Negotiate ${Buffer.from('__fake__').toString('base64')}`,
      });
      this.logger.debug('Request was not supposed to be authenticated, ignoring result.');
      return AuthenticationResult.notHandled();
    } catch (err) {
      // Fail immediately if we get unexpected error (e.g. ES isn't available). We should not touch
      // session cookie in this case.
      if (!ElasticsearchErrorHelpers.isNotAuthorizedError(err)) {
        return AuthenticationResult.failed(err);
      }

      elasticsearchError = err;
    }

    if (this.getNegotiateChallenge(elasticsearchError)) {
      return AuthenticationResult.failed(Boom.unauthorized(), {
        authResponseHeaders: { [WWWAuthenticateHeaderName]: 'Negotiate' },
      });
    }

    // If we failed to do SPNEGO and have a session with expired token that belongs to Kerberos
    // authentication provider then it means Elasticsearch isn't configured to use Kerberos anymore.
    // In this case we should reply with the `401` error and allow Authenticator to clear the cookie.
    // Otherwise give a chance to the next authentication provider to authenticate request.
    return state
      ? AuthenticationResult.failed(Boom.unauthorized())
      : AuthenticationResult.notHandled();
  }

  /**
   * Extracts `Negotiate` challenge from the list of challenges returned with Elasticsearch error if any.
   * @param error Error to extract challenges from.
   */
  private getNegotiateChallenge(error: ElasticsearchError) {
    const challenges = ([] as string[]).concat(error.output.headers[WWWAuthenticateHeaderName]);

    const negotiateChallenge = challenges.find(challenge =>
      challenge.toLowerCase().startsWith('negotiate')
    );
    if (negotiateChallenge) {
      this.logger.debug(`SPNEGO is supported by the backend, challenges are: [${challenges}].`);
    } else {
      this.logger.debug(`SPNEGO is not supported by the backend, challenges are: [${challenges}].`);
    }

    return negotiateChallenge;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Legacy } from '../../../../../../../kibana';
import { AuthenticatedUser } from '../../../../common/model';
import { canRedirectRequest } from '../../can_redirect_request';
import { getErrorStatusCode } from '../../errors';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { AuthenticationProviderOptions, BaseAuthenticationProvider } from './base';

/**
 * The state supported by the provider (for the OpenID Connect handshake or established session).
 */
interface ProviderState {
  /**
   * Unique identifier of the OpenID Connect request initiated the handshake used to mitigate
   * replay attacks.
   */
  nonce?: string;

  /**
   * Unique identifier of the OpenID Connect request initiated the handshake used to mitigate
   * CSRF.
   */
  state?: string;

  /**
   * URL to redirect user to after successful OpenID Connect handshake.
   */
  nextURL?: string;

  /**
   * Access token issued as the result of successful OpenID Connect handshake and that should be provided with
   * every request to Elasticsearch on behalf of the authenticated user. This token will eventually expire.
   */
  accessToken?: string;

  /**
   * Once access token expires the refresh token is used to get a new pair of access/refresh tokens
   * without any user involvement. If not used this token will eventually expire as well.
   */
  refreshToken?: string;
}

/**
 * Defines the shape of an incoming OpenID Connect Request
 */
type OidcIncomingRequest = Legacy.Request & {
  payload: { iss?: string };
  query: { iss?: string, code?: string, state?: string };
};

/**
 * Defines the parameters that can be passed to ES when calling the /oidc/prepare endpoint
 */
interface OidcPrepareParams {
  nonce?: string;
  state?: string;
  iss?: string;
  code?: string;
  realm?: string;
}

/**
 * Defines the realm specific properties
 */
type OpenIdConnectProviderOptions =  AuthenticationProviderOptions & {
  realm: string;
};

function isOidcIncomingRequest(request: Legacy.Request): request is OidcIncomingRequest {
  return (request.payload != null && !!(request.payload as any).iss) ||
    (request.query != null && (!!(request.query as any).iss || !!(request.query as any).code));
}

/**
 * Checks the error returned by Elasticsearch as the result of `authenticate` call and returns `true` if request
 * has been rejected because of expired token, otherwise returns `false`.
 * @param {Object} err Error returned from Elasticsearch.
 * @returns {boolean}
 */
function isAccessTokenExpiredError(err?: any) {
  const errorStatusCode = getErrorStatusCode(err);
  return (
    errorStatusCode === 401 ||
    (errorStatusCode === 500 &&
      err &&
      err.body &&
      err.body.error &&
      err.body.error.reason === 'token document is missing and must be present')
  );
}

/**
 * Provider that supports authentication using an OpenID Connect realm in Elasticsearch.
 */
export class OpenIdConnectAuthenticationProvider extends BaseAuthenticationProvider {

  _options: OpenIdConnectProviderOptions;

  constructor(options: AuthenticationProviderOptions){
    super(options);
    this._options = options as OpenIdConnectProviderOptions;
  }

  /**
   * Performs OpenID Connect request authentication.
   * @param request instance.
   * @param [state] Optional state object associated with the provider.

   */
  public async authenticate(request: Legacy.Request, state?: ProviderState | null) {
    this.debug(`Trying to authenticate user request to ${request.url.path}.`);

    let {
      authenticationResult,
      headerNotRecognized, // eslint-disable-line prefer-const
    } = await this.authenticateViaHeader(request);
    if (headerNotRecognized) {
      return authenticationResult;
    }

    if (state && authenticationResult.notHandled()) {
      authenticationResult = await this.authenticateViaState(request, state);
      if (authenticationResult.failed() && isAccessTokenExpiredError(authenticationResult.error)) {
        authenticationResult = await this.authenticateViaRefreshToken(request, state);
      }
    }
    if (isOidcIncomingRequest(request)) {
      if (authenticationResult.notHandled()) {
        // This might be the OpenID Connect Provider redirecting the user to `redirect_uri` after authentication or
        // a third party initiating an authentication
        authenticationResult = await this.authenticateViaResponseUrl(request, state);
      } else if (authenticationResult.succeeded()){
        // If user has been authenticated via session, but request also includes an OpenIDConnect response
        // we should check whether this response is for the exactly same user and if not
        // we'll re-authenticate user and forward to a page with the respective warning.
        authenticationResult = await this.authenticateViaNewResponseUrl(
          request,
          (authenticationResult.state || state) as ProviderState,
          authenticationResult.user as AuthenticatedUser,
        );
      }
    }

    // If we couldn't authenticate by means of all methods above, let's try to
    // initiate an OpenID Connect based authentication, otherwise just return the authentication result we have.
    // We might already have a state and nonce generated by Elasticsearch (from an unfinished authentication in
    // another tab)
    const params = this.addStateNonceFromSession({ realm: this.getRealmName() }, state);
    return authenticationResult.notHandled()
      ? await this.initiateOpenIdConnectAuthentication(request, params)
      : authenticationResult;
  }

  /**
   * Attempts to handle a request that might be a third party initiated OpenID connect authentication attempt or the
   * OpenID Connect Provider redirecting back the UA after an authentication success/failure. In the former case which
   * is signified by the existence of an iss parameter (either in the query of a GET request or the body of a POST
   * request) it attempts to start the authentication flow by calling initiateOpenIdConnectAuthentication.
   *
   * In the latter case, it attempts to exchange the authentication response to an Elasticsearch access token, passing
   * along to Elasticsearch the state and nonce parameters from the user's session.
   *
   * When login succeeds the Elasticsearch access token and refresh token are stored in the state and user is redirected
   * to the URL that was requested before authentication flow started or to default Kibana location in case of a third
   * party initiated login
   * @param request Request instance.
   * @param [sessionState] Optional state object associated with the provider.
   */
  private async authenticateViaResponseUrl(request: OidcIncomingRequest, sessionState?: ProviderState | null) {
    this.debug('Trying to authenticate via OpenId Connect response query.');
    // First check to see if this is a Third Party initiated authentication (which can happen via POST or GET)
    let iss = null;
    if (request.query) {
      iss = request.query.iss;
    } else if (request.payload) {
      iss = request.payload.iss;
    }
    if (iss) {
      this.debug('Authentication has been initiated by a Third Party.');
      // We might already have a state and nonce generated by Elasticsearch (from an unfinished authentication in
      // another tab)
      const params = this.addStateNonceFromSession({ iss: iss }, sessionState);
      return this.initiateOpenIdConnectAuthentication(request, params);
    }

    if (!request.query || !request.query.code) {
      this.debug('OpenID Connect Authentication response is not found.');
      return AuthenticationResult.notHandled();
    }

    // If it is an authentication response and the users' session state doesn't contain all the necessary information,
    // then something unexpected happened and we should fail because Elasticsearch won't be able to validate the
    // response.
    const { nonce: stateNonce, state: stateOidcState, nextURL: stateRedirectURL } = sessionState || {
      nonce: '',
      state: '',
      nextURL: '',
    };
    if (!sessionState || (!stateNonce || !stateOidcState || !stateRedirectURL)) {
      const message = 'Response session state does not have corresponding state or nonce parameters or redirect URL.';
      this.debug(message);

      return AuthenticationResult.failed(Boom.badRequest(message));
    }

    // We have all the necessary parameters, so attempt to complete the OpenID Connect Authentication
    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/oidc/authenticate`.
      const {
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this._options.client.callWithInternalUser('shield.oidcAuthenticate', {
        body: {
          state: stateOidcState,
          nonce: stateNonce,
          // pass the path only as we can't be sure of the full URL and Elasticsearch doesn't need it anyway
          redirect_uri: request.url.path,
        },
      });

      this.debug('Request has been authenticated via OpenID Connect.');

      return AuthenticationResult.redirectTo(
        stateRedirectURL || `${this._options.basePath}/`,
        { accessToken, refreshToken },
      );
    } catch (err) {
      this.debug(`Failed to authenticate request via OpenIdConnect: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }


  /**
   * Validates whether user retrieved using session is the same as the user for which we received an
   * OpenID Connect authentication response.
   * If we can successfully exchange this OIDC response with access and refresh tokens, then we'll
   * invalidate tokens from the existing session and use the new ones instead.
   *
   * The tokens are stored in the state and user is redirected to the default Kibana location, unless
   * we detect that user from existing session isn't the same as defined in OIDC response. In this case
   * we'll forward user to a page with the respective warning.
   * @param request Request instance.
   * @param existingState State existing user session is based on.
   * @param user User returned for the existing session.
   */
  private async authenticateViaNewResponseUrl(
    request: OidcIncomingRequest,
    existingState: ProviderState,
    user: AuthenticatedUser,
  ) {
    this.debug('Trying to authenticate via OpenID Connect response with existing valid session.');

    // First let's try to authenticate via OpenID Connect response URL.
    const payloadAuthenticationResult = await this.authenticateViaResponseUrl(request);
    if (payloadAuthenticationResult.failed()) {
      return payloadAuthenticationResult;
    } else if (!payloadAuthenticationResult.shouldUpdateState()) {
      // Should never happen, but if it does - it's a bug.
      return AuthenticationResult.failed(
        new Error('Authentication via OpenID Connect response URL did not produce access and refresh tokens.'),
      );
    }

    const newState = payloadAuthenticationResult.state as ProviderState;

    // Then use received tokens to retrieve user information. We need just username and authentication
    // realm, once ES starts returning this info from `oidc/authenticate` we can get rid of this call.
    const newUserAuthenticationResult = await this.authenticateViaState(request, newState);
    if (newUserAuthenticationResult.failed()) {
      return newUserAuthenticationResult;
    } else if (newUserAuthenticationResult.user === undefined) {
      // Should never happen, but if it does - it's a bug.
      return AuthenticationResult.failed(
        new Error('Could not retrieve user information using tokens produced for the OpenID Connect response URL.'),
      );
    }

    // Now let's invalidate tokens from the existing session.
    try {
      await this.invalidateTokens(
        existingState.accessToken!,
        existingState.refreshToken!,
      );
    } catch (err) {
      this.debug(`Failed to invalidate existing tokens on reauthentication: ${err.message}`);
      return AuthenticationResult.failed(err);
    }

    if (
      newUserAuthenticationResult.user.username !== user.username ||
      newUserAuthenticationResult.user.authentication_realm.name !== user.authentication_realm.name
    ) {
      this.debug(
        'Authentication response is for a different user than currently authenticated.',
      );

      return AuthenticationResult.redirectTo(
        `${this._options.basePath}/overwritten_session`,
        newState,
      );
    }

    this.debug(
      'Authentication response is for currently authenticated user.',
    );
    return payloadAuthenticationResult;
  }

  /**
   * Initiates an authentication attempt by either providing the realm name or the issuer to Elasticsearch
   *
   * @param request Request instance.
   * @param params
   */
  private async initiateOpenIdConnectAuthentication(request: Legacy.Request, params: OidcPrepareParams) {
    this.debug('Trying to initiate OpenID Connect authentication.');

    // If client can't handle redirect response, we shouldn't initiate OpenID Connect authentication.
    if (!canRedirectRequest(request)) {
      this.debug('OpenID Connect authentication can not be initiated by AJAX requests.');
      return AuthenticationResult.notHandled();
    }

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/oidc/prepare`.
      const {
        state,
        nonce,
        redirect,
      } = await this._options.client.callWithInternalUser('shield.oidcPrepare', {
          body: params,
        });

      this.debug('Redirecting to OpenID Connect Provider with authentication request.');
      // If this is a third party initiated login, redirect to /
      const redirectAfterLogin = params.iss ? `${request.getBasePath()}` : `${request.getBasePath()}${request.url.path}`;

      return AuthenticationResult.redirectTo(
        redirect,
        // Store the state and nonce parameters in the session state of the user
        { state, nonce, nextURL: redirectAfterLogin },
      );
    } catch (err) {
      this.debug(`Failed to initiate OpenID Connect authentication: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }


  /**
   * Validates whether request contains `Bearer ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param request Request instance.

   */
  private async authenticateViaHeader(request: Legacy.Request) {
    this.debug('Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization) {
      this.debug('Authorization header is not presented.');
      return {
        authenticationResult: AuthenticationResult.notHandled(),
      };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'bearer') {
      this.debug(`Unsupported authentication schema: ${authenticationSchema}`);
      return {
        authenticationResult: AuthenticationResult.notHandled(),
        headerNotRecognized: true,
      };
    }

    try {
      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate',
      );

      this.debug('Request has been authenticated via header.');

      return {
        authenticationResult: AuthenticationResult.succeeded(user),
      };
    } catch (err) {
      this.debug(`Failed to authenticate request via header: ${err.message}`);
      return {
        authenticationResult: AuthenticationResult.failed(err),
      };
    }
  }

  /**
   * Tries to extract an Elasticsearch access token from state and adds it to the request before it's
   * forwarded to Elasticsearch backend.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaState(request: Legacy.Request, { accessToken }: ProviderState) {
    this.debug('Trying to authenticate via state.');

    if (!accessToken) {
      this.debug('Elasticsearch access token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    request.headers.authorization = `Bearer ${accessToken}`;

    try {
      const user = await this._options.client.callWithRequest(
        request,
        'shield.authenticate',
      );

      this.debug('Request has been authenticated via state.');

      return AuthenticationResult.succeeded(user);
    } catch (err) {
      this.debug(`Failed to authenticate request via state: ${err.message}`);

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
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  private async authenticateViaRefreshToken(request: Legacy.Request, { refreshToken }: ProviderState) {
    this.debug('Trying to refresh elasticsearch access token.');

    if (!refreshToken) {
      this.debug('Refresh token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    try {
      // Token should be refreshed by the same user that obtained that token.
      const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      } = await this._options.client.callWithInternalUser(
        'shield.getAccessToken',
        { body: { grant_type: 'refresh_token', refresh_token: refreshToken } },
      );

      this.debug('Elasticsearch access token has been successfully refreshed.');

      request.headers.authorization = `Bearer ${newAccessToken}`;

      const user = await this._options.client.callWithRequest(request, 'shield.authenticate');

      this.debug('Request has been authenticated via refreshed token.');

      return AuthenticationResult.succeeded(
        user,
        { accessToken: newAccessToken, refreshToken: newRefreshToken },
      );
    } catch (err) {
      this.debug(`Failed to refresh elasticsearch access token: ${err.message}`);

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
      // happen. E.g. when several simultaneous AJAX request has been sent to Kibana, but Elasticsearch access token has
      // expired already, so the first request that reaches Kibana uses refresh token to get a new elasticsearch access
      // token, but the second concurrent request has no idea about that and tries to refresh access token as well. All
      // ends well when first request refreshes access token and updates session cookie with fresh access/refresh token
      // pair. But if user navigates to another page _before_ AJAX request (the one that triggered token refresh)
      // responds with updated cookie, then user will have only that old cookie with expired access token and refresh
      // token that has been used already.
      //
      // When user has neither valid access nor refresh token, the only way to resolve this issue is to re-initiate the
      // OpenID Connect authentication by requesting a new authentication request to send to the OpenID Connect Provider
      // and exchange it's forthcoming response for a new Elasticsearch access/refresh token pair. In case this is an
      // AJAX request, we just reply with `400` and clear error message.
      // There are two reasons for `400` and not `401`: Elasticsearch search responds with `400` so it seems logical
      // to do the same on Kibana side and `401` would force user to logout and do full SLO if it's supported.
      if (getErrorStatusCode(err) === 400) {
        if (canRedirectRequest(request)) {
          this.debug('Both access and refresh tokens are expired. Re-initiating OpenID Connect authentication.');
          return this.initiateOpenIdConnectAuthentication(request, { realm: this.getRealmName() });
        }

        return AuthenticationResult.failed(Boom.badRequest('Both access and refresh tokens are expired.'));
      }

      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Invalidates an Elasticsearch access token and refresh token that was originally created as an successful response
   * to an OpenID Connect based authentication. This does not handle OP initiated Single Logout
   * @param request Request instance.
   * @param  state State value previously stored by the provider.
   */
  public async deauthenticate(request: Legacy.Request, state: ProviderState) {
    this.debug(`Trying to deauthenticate user via ${request.url.path}.`);

    if ((!state || !state.accessToken)) {
      this.debug('There is no Elasticsearch access token to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      const logoutBody = {
        body: {
          token: state.accessToken,
          refresh_token: state.refreshToken,
        },
      };
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/oidc/logout`.
      const { redirect } = await this._options.client.callWithInternalUser('shield.oidcLogout', logoutBody);

      this.debug('User session has been successfully invalidated.');

      // Having non-null `redirect` field within logout response means that the OpenID Connect realm configuration
      // supports RP initiated Single Logout and we should redirect user to the specified location in the OpenID Connect
      // Provider to properly complete logout.
      if (redirect != null) {
        this.debug('Redirecting user to the OpenID Connect Provider to complete logout.');
        return DeauthenticationResult.redirectTo(redirect);
      }

      return DeauthenticationResult.redirectTo(`${this._options.basePath}/logged_out`);
    } catch(err) {
      this.debug(`Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }

  /**
   * Invalidates access and refresh tokens without calling `oidc/logout`.
   * @param accessToken Access token to invalidate.
   * @param refreshToken Refresh token to invalidate.
   */
  private async invalidateTokens(accessToken: string, refreshToken: string) {

    // First invalidate old access token.
    const {
      invalidated_tokens: invalidatedAccessTokensCount,
    } = await this._options.client.callWithInternalUser('shield.deleteAccessToken', {
      body: { token: accessToken },
    });

    if (invalidatedAccessTokensCount === 0) {
      this.debug('User access token was already invalidated.');
    } else if (invalidatedAccessTokensCount === 1) {
      this.debug('User access token has been successfully invalidated.');
    } else {
      this.debug(
        `${invalidatedAccessTokensCount} user access tokens were invalidated, this is unexpected.`,
      );
    }

    // Then invalidate old refresh token.
    const {
      invalidated_tokens: invalidatedRefreshTokensCount,
    } = await this._options.client.callWithInternalUser('shield.deleteAccessToken', {
      body: { refresh_token: refreshToken },
    });

    if (invalidatedRefreshTokensCount === 0) {
      this.debug('User refresh token was already invalidated.');
    } else if (invalidatedRefreshTokensCount === 1) {
      this.debug('User refresh token has been successfully invalidated.');
    } else {
      this.debug(
        `${invalidatedRefreshTokensCount} user refresh tokens were invalidated, this is unexpected.`,
      );
    }
  }

  /**
   * Gets Elasticsearch OpenID Connect Realm name
   * @returns {string}
   */
  private getRealmName() {
    return `${this._options.realm}`;
  }

  /**
   * Possibly adds the state and nonce parameter that was saved in the user's session state to the
   * {@code params}. There is no use case where we would have only a state parameter or only a nonce
   * parameter in the session state so we only enrich the params object if we have both
   * @param params OidcPrepareParams containing existing parameters
   * @param sessionState State value previously stored by the provider.
   */
  private addStateNonceFromSession(params: OidcPrepareParams, sessionState?: ProviderState | null) {
    const { nonce: stateNonce, state: stateOidcState } = sessionState || {
      nonce: '',
      state: '',
    };
    if (stateOidcState && stateNonce) {
      return { ...params, ...{ nonce: stateNonce, state: stateOidcState } };
    } else {
      return params;
    }
  }


  /**
   * Logs message with `debug` level and oidc/security related tags.
   * @param message Message to log.
   */
  private debug(message: string) {
    this._options.log(['debug', 'security', 'oidc'], message);
  }
}

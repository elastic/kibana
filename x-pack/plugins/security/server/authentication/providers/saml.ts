/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ByteSizeValue } from '@kbn/config-schema';
import { KibanaRequest } from '../../../../../../src/core/server';
import { isInternalURL } from '../../../common/is_internal_url';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { canRedirectRequest } from '../can_redirect_request';
import { HTTPAuthorizationHeader } from '../http_authentication';
import { Tokens, TokenPair } from '../tokens';
import { AuthenticationProviderOptions, BaseAuthenticationProvider } from './base';

/**
 * The state supported by the provider (for the SAML handshake or established session).
 */
interface ProviderState extends Partial<TokenPair> {
  /**
   * Username of the SAML authenticated user.
   */
  username?: string;

  /**
   * Unique identifier of the SAML request initiated the handshake.
   */
  requestId?: string;
  /**
   * Stores path component of the URL only or in a combination with URL fragment that was used to
   * initiate SAML handshake and where we should redirect user after successful authentication.
   */
  redirectURL?: string;

  /**
   * The name of the SAML realm that was used to establish session.
   */
  realm: string;
}

/**
 * Describes possible SAML Login flows.
 */
export enum SAMLLogin {
  /**
   * The login flow when user initiates SAML handshake (SP Initiated Login).
   */
  LoginInitiatedByUser = 'login-by-user',
  /**
   * The login flow when IdP responds with SAML Response payload (last step of the SP Initiated
   * Login or IdP initiated Login).
   */
  LoginWithSAMLResponse = 'login-saml-response',
}

/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
type ProviderLoginAttempt =
  | { type: SAMLLogin.LoginInitiatedByUser; redirectURLPath?: string; redirectURLFragment?: string }
  | { type: SAMLLogin.LoginWithSAMLResponse; samlResponse: string; relayState?: string };

/**
 * Checks whether request query includes SAML request from IdP.
 * @param query Parsed HTTP request query.
 */
function isSAMLRequestQuery(query: any): query is { SAMLRequest: string } {
  return query && query.SAMLRequest;
}

/**
 * Checks whether request query includes SAML response from IdP.
 * @param query Parsed HTTP request query.
 */
function isSAMLResponseQuery(query: any): query is { SAMLResponse: string } {
  return query && query.SAMLResponse;
}

/**
 * Checks whether current request can initiate new session.
 * @param request Request instance.
 */
function canStartNewSession(request: KibanaRequest) {
  // We should try to establish new session only if request requires authentication and client
  // can be redirected to the Identity Provider where they can authenticate.
  return canRedirectRequest(request) && request.route.options.authRequired === true;
}

/**
 * Provider that supports SAML request authentication.
 */
export class SAMLAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Type of the provider.
   */
  static readonly type = 'saml';

  /**
   * Specifies Elasticsearch SAML realm name that Kibana should use.
   */
  private readonly realm: string;

  /**
   * Maximum size of the URL we store in the session during SAML handshake.
   */
  private readonly maxRedirectURLSize: ByteSizeValue;

  /**
   * Indicates if we should treat non-empty `RelayState` as a deep link in Kibana we should redirect
   * user to after successful IdP initiated login. `RelayState` is ignored for SP initiated login.
   */
  private readonly useRelayStateDeepLink: boolean;

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    samlOptions?: Readonly<{
      realm?: string;
      maxRedirectURLSize?: ByteSizeValue;
      useRelayStateDeepLink?: boolean;
    }>
  ) {
    super(options);

    if (!samlOptions || !samlOptions.realm) {
      throw new Error('Realm name must be specified');
    }

    if (!samlOptions.maxRedirectURLSize) {
      throw new Error('Maximum redirect URL size must be specified');
    }

    this.realm = samlOptions.realm;
    this.maxRedirectURLSize = samlOptions.maxRedirectURLSize;
    this.useRelayStateDeepLink = samlOptions.useRelayStateDeepLink ?? false;
  }

  /**
   * Performs initial login request using SAMLResponse payload.
   * @param request Request instance.
   * @param attempt Login attempt description.
   * @param [state] Optional state object associated with the provider.
   */
  public async login(
    request: KibanaRequest,
    attempt: ProviderLoginAttempt,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to perform a login.');

    // It may happen that Kibana is re-configured to use different realm for the same provider name,
    // we should clear such session an log user out.
    if (state?.realm && state.realm !== this.realm) {
      const message = `State based on realm "${state.realm}", but provider with the name "${this.options.name}" is configured to use realm "${this.realm}".`;
      this.logger.debug(message);
      return AuthenticationResult.failed(Boom.unauthorized(message));
    }

    if (attempt.type === SAMLLogin.LoginInitiatedByUser) {
      const redirectURLPath = attempt.redirectURLPath || state?.redirectURL;
      if (!redirectURLPath) {
        const message = 'State or login attempt does not include URL path to redirect to.';
        this.logger.debug(message);
        return AuthenticationResult.failed(Boom.badRequest(message));
      }

      return this.captureRedirectURL(request, redirectURLPath, attempt.redirectURLFragment);
    }

    const { samlResponse, relayState } = attempt;
    const authenticationResult = state
      ? await this.authenticateViaState(request, state)
      : AuthenticationResult.notHandled();

    // Let's check if user is redirected to Kibana from IdP with valid SAMLResponse.
    if (authenticationResult.notHandled()) {
      return await this.loginWithSAMLResponse(request, samlResponse, relayState, state);
    }

    // If user has been authenticated via session or failed to do so because of expired access token,
    // but request also includes SAML payload we should check whether this payload is for the exactly
    // same user and if not we'll re-authenticate user and forward to a page with the respective warning.
    if (
      authenticationResult.succeeded() ||
      (authenticationResult.failed() &&
        Tokens.isAccessTokenExpiredError(authenticationResult.error))
    ) {
      return await this.loginWithNewSAMLResponse(
        request,
        samlResponse,
        relayState,
        (authenticationResult.state || state) as ProviderState
      );
    }

    if (authenticationResult.redirected()) {
      this.logger.debug('Login has been successfully performed.');
    } else {
      this.logger.debug(
        `Failed to perform a login: ${
          authenticationResult.error && authenticationResult.error.message
        }`
      );
    }

    return authenticationResult;
  }

  /**
   * Performs SAML request authentication.
   * @param request Request instance.
   * @param [state] Optional state object associated with the provider.
   */
  public async authenticate(request: KibanaRequest, state?: ProviderState | null) {
    this.logger.debug(`Trying to authenticate user request to ${request.url.path}.`);

    if (HTTPAuthorizationHeader.parseFromRequest(request) != null) {
      this.logger.debug('Cannot authenticate requests with `Authorization` header.');
      return AuthenticationResult.notHandled();
    }

    // It may happen that Kibana is re-configured to use different realm for the same provider name,
    // we should clear such session an log user out.
    if (state?.realm && state.realm !== this.realm) {
      const message = `State based on realm "${state.realm}", but provider with the name "${this.options.name}" is configured to use realm "${this.realm}".`;
      this.logger.debug(message);
      return AuthenticationResult.failed(Boom.unauthorized(message));
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

    // If we couldn't authenticate by means of all methods above, let's try to capture user URL and
    // initiate SAML handshake, otherwise just return authentication result we have.
    return authenticationResult.notHandled() && canStartNewSession(request)
      ? this.captureRedirectURL(request)
      : authenticationResult;
  }

  /**
   * Invalidates SAML access token if it exists.
   * @param request Request instance.
   * @param state State value previously stored by the provider.
   */
  public async logout(request: KibanaRequest, state?: ProviderState) {
    this.logger.debug(`Trying to log user out via ${request.url.path}.`);

    // Normally when there is no active session in Kibana, `logout` method shouldn't do anything
    // and user will eventually be redirected to the home page to log in. But when SAML SLO is
    // supported there are two special cases that we need to handle even if there is no active
    // Kibana session:
    //
    // 1. When IdP or another SP initiates logout, then IdP will request _every_ SP associated with
    // the current user session to do the logout. So if Kibana receives such request it shouldn't
    // redirect user to the home page, but rather redirect back to IdP with correct logout response
    // and only Elasticsearch knows how to do that.
    //
    // 2. When Kibana initiates logout, then IdP may eventually respond with the logout response. So
    // if Kibana receives such response it shouldn't redirect user to the home page, but rather
    // redirect to the `loggedOut` URL instead.
    const isIdPInitiatedSLORequest = isSAMLRequestQuery(request.query);
    const isSPInitiatedSLOResponse = isSAMLResponseQuery(request.query);
    if (!state?.accessToken && !isIdPInitiatedSLORequest && !isSPInitiatedSLOResponse) {
      this.logger.debug('There is no SAML session to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      // It may _theoretically_ (highly unlikely in practice though) happen that when user receives
      // logout response they may already have a new SAML session (isSPInitiatedSLOResponse == true
      // and state !== undefined). In this case case it'd be safer to trigger SP initiated logout
      // for the new session as well.
      const redirect = isIdPInitiatedSLORequest
        ? await this.performIdPInitiatedSingleLogout(request)
        : state
        ? await this.performUserInitiatedSingleLogout(state.accessToken!, state.refreshToken!)
        : // Once Elasticsearch can consume logout response we'll be sending it here. See https://github.com/elastic/elasticsearch/issues/40901
          null;

      // Having non-null `redirect` field within logout response means that IdP
      // supports SAML Single Logout and we should redirect user to the specified
      // location to properly complete logout.
      if (redirect != null) {
        this.logger.debug('Redirecting user to Identity Provider to complete logout.');
        return DeauthenticationResult.redirectTo(redirect);
      }

      return DeauthenticationResult.redirectTo(this.options.urls.loggedOut);
    } catch (err) {
      this.logger.debug(`Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }

  /**
   * Returns HTTP authentication scheme (`Bearer`) that's used within `Authorization` HTTP header
   * that provider attaches to all successfully authenticated requests to Elasticsearch.
   */
  public getHTTPAuthenticationScheme() {
    return 'bearer';
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
   * @param request Request instance.
   * @param samlResponse SAMLResponse payload string.
   * @param relayState RelayState payload string.
   * @param [state] Optional state object associated with the provider.
   */
  private async loginWithSAMLResponse(
    request: KibanaRequest,
    samlResponse: string,
    relayState?: string,
    state?: ProviderState | null
  ) {
    this.logger.debug('Trying to log in with SAML response payload.');

    // If we have a `SAMLResponse` and state, but state doesn't contain all the necessary information,
    // then something unexpected happened and we should fail.
    const { requestId: stateRequestId, redirectURL: stateRedirectURL } = state || {
      requestId: '',
      redirectURL: '',
    };
    if (state && !stateRequestId) {
      const message = 'SAML response state does not have corresponding request id.';
      this.logger.debug(message);
      return AuthenticationResult.failed(Boom.badRequest(message));
    }

    // When we don't have state and hence request id we assume that SAMLResponse came from the IdP initiated login.
    const isIdPInitiatedLogin = !stateRequestId;
    this.logger.debug(
      !isIdPInitiatedLogin
        ? 'Login has been previously initiated by Kibana.'
        : 'Login has been initiated by Identity Provider.'
    );

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/authenticate`.
      const {
        username,
        access_token: accessToken,
        refresh_token: refreshToken,
      } = await this.options.client.callAsInternalUser('shield.samlAuthenticate', {
        body: {
          ids: !isIdPInitiatedLogin ? [stateRequestId] : [],
          content: samlResponse,
          realm: this.realm,
        },
      });

      // IdP can pass `RelayState` with the deep link in Kibana during IdP initiated login and
      // depending on the configuration we may need to redirect user to this URL.
      let redirectURLFromRelayState;
      if (isIdPInitiatedLogin && relayState) {
        if (!this.useRelayStateDeepLink) {
          this.options.logger.debug(
            `"RelayState" is provided, but deep links support is not enabled for "${this.type}/${this.options.name}" provider.`
          );
        } else if (!isInternalURL(relayState, this.options.basePath.serverBasePath)) {
          this.options.logger.debug(
            `"RelayState" is provided, but it is not a valid Kibana internal URL.`
          );
        } else {
          this.options.logger.debug(
            `User will be redirected to the Kibana internal URL specified in "RelayState".`
          );
          redirectURLFromRelayState = relayState;
        }
      }

      this.logger.debug('Login has been performed with SAML response.');
      return AuthenticationResult.redirectTo(
        redirectURLFromRelayState || stateRedirectURL || `${this.options.basePath.get(request)}/`,
        { state: { username, accessToken, refreshToken, realm: this.realm } }
      );
    } catch (err) {
      this.logger.debug(`Failed to log in with SAML response: ${err.message}`);

      // Since we don't know upfront what realm is targeted by the Identity Provider initiated login
      // there is a chance that it failed because of realm mismatch and hence we should return
      // `notHandled` and give other SAML providers a chance to properly handle it instead.
      return isIdPInitiatedLogin
        ? AuthenticationResult.notHandled()
        : AuthenticationResult.failed(err);
    }
  }

  /**
   * Validates whether user retrieved using session is the same as the user defined in the SAML payload.
   * If we can successfully exchange this SAML payload to access and refresh tokens, then we'll
   * invalidate tokens from the existing session and use the new ones instead.
   *
   * The tokens are stored in the state and user is redirected to the default Kibana location, unless
   * we detect that user from existing session isn't the same as defined in SAML payload. In this case
   * we'll forward user to a page with the respective warning.
   * @param request Request instance.
   * @param samlResponse SAMLResponse payload string.
   * @param relayState RelayState payload string.
   * @param existingState State existing user session is based on.
   */
  private async loginWithNewSAMLResponse(
    request: KibanaRequest,
    samlResponse: string,
    relayState: string | undefined,
    existingState: ProviderState
  ) {
    this.logger.debug('Trying to log in with SAML response payload and existing valid session.');

    // First let's try to authenticate via SAML Response payload.
    const payloadAuthenticationResult = await this.loginWithSAMLResponse(
      request,
      samlResponse,
      relayState
    );
    if (payloadAuthenticationResult.failed() || payloadAuthenticationResult.notHandled()) {
      return payloadAuthenticationResult;
    }

    if (!payloadAuthenticationResult.shouldUpdateState()) {
      // Should never happen, but if it does - it's a bug.
      return AuthenticationResult.failed(
        new Error('Login with SAML payload did not produce access and refresh tokens.')
      );
    }

    const newState = payloadAuthenticationResult.state as ProviderState;

    // Now let's invalidate tokens from the existing session.
    try {
      this.logger.debug('Perform IdP initiated local logout.');
      await this.options.tokens.invalidate({
        accessToken: existingState.accessToken!,
        refreshToken: existingState.refreshToken!,
      });
    } catch (err) {
      this.logger.debug(`Failed to perform IdP initiated local logout: ${err.message}`);
      return AuthenticationResult.failed(err);
    }

    if (newState.username !== existingState.username) {
      this.logger.debug(
        'Login initiated by Identity Provider is for a different user than currently authenticated.'
      );
      return AuthenticationResult.redirectTo(
        `${this.options.basePath.serverBasePath}/security/overwritten_session`,
        { state: newState }
      );
    }

    this.logger.debug('Login initiated by Identity Provider is for currently authenticated user.');
    return payloadAuthenticationResult;
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
  private async authenticateViaRefreshToken(
    request: KibanaRequest,
    { username, refreshToken }: ProviderState
  ) {
    this.logger.debug('Trying to refresh access token.');

    if (!refreshToken) {
      this.logger.debug('Refresh token is not found in state.');
      return AuthenticationResult.notHandled();
    }

    let refreshedTokenPair: TokenPair | null;
    try {
      refreshedTokenPair = await this.options.tokens.refresh(refreshToken);
    } catch (err) {
      return AuthenticationResult.failed(err);
    }

    // When user has neither valid access nor refresh token, the only way to resolve this issue is to get new
    // SAML LoginResponse and exchange it for a new access/refresh token pair. To do that we initiate a new SAML
    // handshake. Obviously we can't do that for AJAX requests, so we just reply with `400` and clear error message.
    // There are two reasons for `400` and not `401`: Elasticsearch search responds with `400` so it seems logical
    // to do the same on Kibana side and `401` would force user to logout and do full SLO if it's supported.
    if (refreshedTokenPair === null) {
      if (canStartNewSession(request)) {
        this.logger.debug(
          'Both access and refresh tokens are expired. Capturing redirect URL and re-initiating SAML handshake.'
        );
        return this.captureRedirectURL(request);
      }

      return AuthenticationResult.failed(
        Boom.badRequest('Both access and refresh tokens are expired.')
      );
    }

    try {
      const authHeaders = {
        authorization: new HTTPAuthorizationHeader(
          'Bearer',
          refreshedTokenPair.accessToken
        ).toString(),
      };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via refreshed token.');
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        state: { username, realm: this.realm, ...refreshedTokenPair },
      });
    } catch (err) {
      this.logger.debug(
        `Failed to authenticate user using newly refreshed access token: ${err.message}`
      );
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Tries to start SAML handshake and eventually receive a token.
   * @param request Request instance.
   * @param redirectURL URL to redirect user to after successful SAML handshake.
   */
  private async authenticateViaHandshake(request: KibanaRequest, redirectURL: string) {
    this.logger.debug('Trying to initiate SAML handshake.');

    try {
      // This operation should be performed on behalf of the user with a privilege that normal
      // user usually doesn't have `cluster:admin/xpack/security/saml/prepare`.
      const { id: requestId, redirect } = await this.options.client.callAsInternalUser(
        'shield.samlPrepare',
        {
          body: { realm: this.realm },
        }
      );

      this.logger.debug('Redirecting to Identity Provider with SAML request.');

      // Store request id in the state so that we can reuse it once we receive `SAMLResponse`.
      return AuthenticationResult.redirectTo(redirect, {
        state: { requestId, redirectURL, realm: this.realm },
      });
    } catch (err) {
      this.logger.debug(`Failed to initiate SAML handshake: ${err.message}`);
      return AuthenticationResult.failed(err);
    }
  }

  /**
   * Calls `saml/logout` with access and refresh tokens and redirects user to the Identity Provider if needed.
   * @param accessToken Access token to invalidate.
   * @param refreshToken Refresh token to invalidate.
   */
  private async performUserInitiatedSingleLogout(accessToken: string, refreshToken: string) {
    this.logger.debug('Single logout has been initiated by the user.');

    // This operation should be performed on behalf of the user with a privilege that normal
    // user usually doesn't have `cluster:admin/xpack/security/saml/logout`.
    const { redirect } = await this.options.client.callAsInternalUser('shield.samlLogout', {
      body: { token: accessToken, refresh_token: refreshToken },
    });

    this.logger.debug('User session has been successfully invalidated.');

    return redirect;
  }

  /**
   * Calls `saml/invalidate` with the `SAMLRequest` query string parameter received from the Identity
   * Provider and redirects user back to the Identity Provider if needed.
   * @param request Request instance.
   */
  private async performIdPInitiatedSingleLogout(request: KibanaRequest) {
    this.logger.debug('Single logout has been initiated by the Identity Provider.');

    // This operation should be performed on behalf of the user with a privilege that normal
    // user usually doesn't have `cluster:admin/xpack/security/saml/invalidate`.
    const { redirect } = await this.options.client.callAsInternalUser('shield.samlInvalidate', {
      // Elasticsearch expects `queryString` without leading `?`, so we should strip it with `slice`.
      body: {
        queryString: request.url.search ? request.url.search.slice(1) : '',
        realm: this.realm,
      },
    });

    this.logger.debug('User session has been successfully invalidated.');

    return redirect;
  }

  /**
   * Tries to capture full redirect URL (both path and fragment) and initiate SAML handshake.
   * @param request Request instance.
   * @param [redirectURLPath] Optional URL path user is supposed to be redirected to after successful
   * login. If not provided the URL path of the specified request is used.
   * @param [redirectURLFragment] Optional URL fragment of the URL user is supposed to be redirected
   * to after successful login. If not provided user will be redirected to the client-side page that
   * will grab it and redirect user back to Kibana to initiate SAML handshake.
   */
  private captureRedirectURL(
    request: KibanaRequest,
    redirectURLPath = `${this.options.basePath.get(request)}${request.url.path}`,
    redirectURLFragment?: string
  ) {
    // If the size of the path already exceeds the maximum allowed size of the URL to store in the
    // session there is no reason to try to capture URL fragment and we start handshake immediately.
    // In this case user will be redirected to the Kibana home/root after successful login.
    let redirectURLSize = new ByteSizeValue(Buffer.byteLength(redirectURLPath));
    if (this.maxRedirectURLSize.isLessThan(redirectURLSize)) {
      this.logger.warn(
        `Max URL path size should not exceed ${this.maxRedirectURLSize.toString()} but it was ${redirectURLSize.toString()}. URL is not captured.`
      );
      return this.authenticateViaHandshake(request, '');
    }

    // If URL fragment wasn't specified at all, let's try to capture it.
    if (redirectURLFragment === undefined) {
      return AuthenticationResult.redirectTo(
        `${this.options.basePath.serverBasePath}/internal/security/saml/capture-url-fragment`,
        { state: { redirectURL: redirectURLPath, realm: this.realm } }
      );
    }

    if (redirectURLFragment.length > 0 && !redirectURLFragment.startsWith('#')) {
      this.logger.warn('Redirect URL fragment does not start with `#`.');
      redirectURLFragment = `#${redirectURLFragment}`;
    }

    let redirectURL = `${redirectURLPath}${redirectURLFragment}`;
    redirectURLSize = new ByteSizeValue(Buffer.byteLength(redirectURL));
    if (this.maxRedirectURLSize.isLessThan(redirectURLSize)) {
      this.logger.warn(
        `Max URL size should not exceed ${this.maxRedirectURLSize.toString()} but it was ${redirectURLSize.toString()}. Only URL path is captured.`
      );
      redirectURL = redirectURLPath;
    } else {
      this.logger.debug('Captured redirect URL.');
    }

    return this.authenticateViaHandshake(request, redirectURL);
  }
}

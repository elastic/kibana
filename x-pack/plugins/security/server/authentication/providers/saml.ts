/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ByteSizeValue } from '@kbn/config-schema';
import { KibanaRequest } from '../../../../../../src/core/server';
import { AuthenticationResult } from '../authentication_result';
import { DeauthenticationResult } from '../deauthentication_result';
import { AuthenticationProviderOptions, BaseAuthenticationProvider } from './base';
import { Tokens, TokenPair } from '../tokens';
import { canRedirectRequest } from '..';

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
}

/**
 * Describes possible SAML Login steps.
 */
export enum SAMLLoginStep {
  /**
   * The final login step when IdP responds with SAML Response payload.
   */
  SAMLResponseReceived = 'saml-response-received',
  /**
   * The login step when we've captured user URL fragment and ready to start SAML handshake.
   */
  RedirectURLFragmentCaptured = 'redirect-url-fragment-captured',
}

/**
 * Describes the parameters that are required by the provider to process the initial login request.
 */
type ProviderLoginAttempt =
  | { step: SAMLLoginStep.RedirectURLFragmentCaptured; redirectURLFragment: string }
  | { step: SAMLLoginStep.SAMLResponseReceived; samlResponse: string };

/**
 * Checks whether request query includes SAML request from IdP.
 * @param query Parsed HTTP request query.
 */
export function isSAMLRequestQuery(query: any): query is { SAMLRequest: string } {
  return query && query.SAMLRequest;
}

/**
 * Provider that supports SAML request authentication.
 */
export class SAMLAuthenticationProvider extends BaseAuthenticationProvider {
  /**
   * Specifies Elasticsearch SAML realm name that Kibana should use.
   */
  private readonly realm: string;

  /**
   * Maximum size of the URL we store in the session during SAML handshake.
   */
  private readonly maxRedirectURLSize: ByteSizeValue;

  constructor(
    protected readonly options: Readonly<AuthenticationProviderOptions>,
    samlOptions?: Readonly<{ realm?: string; maxRedirectURLSize?: ByteSizeValue }>
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

    if (attempt.step === SAMLLoginStep.RedirectURLFragmentCaptured) {
      if (!state || !state.redirectURL) {
        const message = 'State does not include URL path to redirect to.';
        this.logger.debug(message);
        return AuthenticationResult.failed(Boom.badRequest(message));
      }

      let redirectURLFragment = attempt.redirectURLFragment;
      if (redirectURLFragment.length > 0 && !redirectURLFragment.startsWith('#')) {
        this.logger.warn('Redirect URL fragment does not start with `#`.');
        redirectURLFragment = `#${redirectURLFragment}`;
      }

      let redirectURL = `${state.redirectURL}${redirectURLFragment}`;
      const redirectURLSize = new ByteSizeValue(Buffer.byteLength(redirectURL));
      if (this.maxRedirectURLSize.isLessThan(redirectURLSize)) {
        this.logger.warn(
          `Max URL size should not exceed ${this.maxRedirectURLSize.toString()} but it was ${redirectURLSize.toString()}. Only URL path is captured.`
        );
        redirectURL = state.redirectURL;
      } else {
        this.logger.debug('Captured redirect URL.');
      }

      return this.authenticateViaHandshake(request, redirectURL);
    }

    const { samlResponse } = attempt;
    const authenticationResult = state
      ? await this.authenticateViaState(request, state)
      : AuthenticationResult.notHandled();

    // Let's check if user is redirected to Kibana from IdP with valid SAMLResponse.
    if (authenticationResult.notHandled()) {
      return await this.loginWithSAMLResponse(request, samlResponse, state);
    }

    if (authenticationResult.succeeded()) {
      // If user has been authenticated via session, but request also includes SAML payload
      // we should check whether this payload is for the exactly same user and if not
      // we'll re-authenticate user and forward to a page with the respective warning.
      return await this.loginWithNewSAMLResponse(
        request,
        samlResponse,
        (authenticationResult.state || state) as ProviderState
      );
    }

    if (authenticationResult.redirected()) {
      this.logger.debug('Login has been successfully performed.');
    } else {
      this.logger.debug(
        `Failed to perform a login: ${authenticationResult.error &&
          authenticationResult.error.message}`
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

    // We should get rid of `Bearer` scheme support as soon as Reporting doesn't need it anymore.
    let {
      authenticationResult,
      // eslint-disable-next-line prefer-const
      headerNotRecognized,
    } = await this.authenticateViaHeader(request);
    if (headerNotRecognized) {
      return authenticationResult;
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

    // If we couldn't authenticate by means of all methods above, let's try to capture user URL and
    // initiate SAML handshake, otherwise just return authentication result we have.
    return authenticationResult.notHandled() && canRedirectRequest(request)
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

    if ((!state || !state.accessToken) && !isSAMLRequestQuery(request.query)) {
      this.logger.debug('There is neither access token nor SAML session to invalidate.');
      return DeauthenticationResult.notHandled();
    }

    try {
      const redirect = isSAMLRequestQuery(request.query)
        ? await this.performIdPInitiatedSingleLogout(request)
        : await this.performUserInitiatedSingleLogout(state!.accessToken!, state!.refreshToken!);

      // Having non-null `redirect` field within logout response means that IdP
      // supports SAML Single Logout and we should redirect user to the specified
      // location to properly complete logout.
      if (redirect != null) {
        this.logger.debug('Redirecting user to Identity Provider to complete logout.');
        return DeauthenticationResult.redirectTo(redirect);
      }

      return DeauthenticationResult.redirectTo(
        `${this.options.basePath.serverBasePath}/logged_out`
      );
    } catch (err) {
      this.logger.debug(`Failed to deauthenticate user: ${err.message}`);
      return DeauthenticationResult.failed(err);
    }
  }

  /**
   * Validates whether request contains `Bearer ***` Authorization header and just passes it
   * forward to Elasticsearch backend.
   * @param request Request instance.
   */
  private async authenticateViaHeader(request: KibanaRequest) {
    this.logger.debug('Trying to authenticate via header.');

    const authorization = request.headers.authorization;
    if (!authorization || typeof authorization !== 'string') {
      this.logger.debug('Authorization header is not presented.');
      return { authenticationResult: AuthenticationResult.notHandled() };
    }

    const authenticationSchema = authorization.split(/\s+/)[0];
    if (authenticationSchema.toLowerCase() !== 'bearer') {
      this.logger.debug(`Unsupported authentication schema: ${authenticationSchema}`);
      return {
        authenticationResult: AuthenticationResult.notHandled(),
        headerNotRecognized: true,
      };
    }

    try {
      const user = await this.getUser(request);

      this.logger.debug('Request has been authenticated via header.');
      return { authenticationResult: AuthenticationResult.succeeded(user) };
    } catch (err) {
      this.logger.debug(`Failed to authenticate request via header: ${err.message}`);
      return { authenticationResult: AuthenticationResult.failed(err) };
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
   * @param request Request instance.
   * @param samlResponse SAMLResponse payload string.
   * @param [state] Optional state object associated with the provider.
   */
  private async loginWithSAMLResponse(
    request: KibanaRequest,
    samlResponse: string,
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
    this.logger.debug(
      stateRequestId
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
          ids: stateRequestId ? [stateRequestId] : [],
          content: samlResponse,
          realm: this.realm,
        },
      });

      this.logger.debug('Login has been performed with SAML response.');
      return AuthenticationResult.redirectTo(
        stateRedirectURL || `${this.options.basePath.get(request)}/`,
        { state: { username, accessToken, refreshToken } }
      );
    } catch (err) {
      this.logger.debug(`Failed to log in with SAML response: ${err.message}`);
      return AuthenticationResult.failed(err);
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
   * @param existingState State existing user session is based on.
   */
  private async loginWithNewSAMLResponse(
    request: KibanaRequest,
    samlResponse: string,
    existingState: ProviderState
  ) {
    this.logger.debug('Trying to log in with SAML response payload and existing valid session.');

    // First let's try to authenticate via SAML Response payload.
    const payloadAuthenticationResult = await this.loginWithSAMLResponse(request, samlResponse);
    if (payloadAuthenticationResult.failed()) {
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
        `${this.options.basePath.get(request)}/overwritten_session`,
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
      if (canRedirectRequest(request)) {
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
      const authHeaders = { authorization: `Bearer ${refreshedTokenPair.accessToken}` };
      const user = await this.getUser(request, authHeaders);

      this.logger.debug('Request has been authenticated via refreshed token.');
      return AuthenticationResult.succeeded(user, {
        authHeaders,
        state: { username, ...refreshedTokenPair },
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

    // If client can't handle redirect response, we shouldn't initiate SAML handshake.
    if (!canRedirectRequest(request)) {
      this.logger.debug('SAML handshake can not be initiated by AJAX requests.');
      return AuthenticationResult.notHandled();
    }

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
      return AuthenticationResult.redirectTo(redirect, { state: { requestId, redirectURL } });
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
   * Redirects user to the client-side page that will grab URL fragment and redirect user back to Kibana
   * to initiate SAML handshake.
   * @param request Request instance.
   */
  private captureRedirectURL(request: KibanaRequest) {
    const basePath = this.options.basePath.get(request);
    const redirectURL = `${basePath}${request.url.path}`;

    // If the size of the path already exceeds the maximum allowed size of the URL to store in the
    // session there is no reason to try to capture URL fragment and we start handshake immediately.
    // In this case user will be redirected to the Kibana home/root after successful login.
    const redirectURLSize = new ByteSizeValue(Buffer.byteLength(redirectURL));
    if (this.maxRedirectURLSize.isLessThan(redirectURLSize)) {
      this.logger.warn(
        `Max URL path size should not exceed ${this.maxRedirectURLSize.toString()} but it was ${redirectURLSize.toString()}. URL is not captured.`
      );
      return this.authenticateViaHandshake(request, '');
    }

    return AuthenticationResult.redirectTo(
      `${this.options.basePath.serverBasePath}/api/security/saml/capture-url-fragment`,
      { state: { redirectURL } }
    );
  }
}

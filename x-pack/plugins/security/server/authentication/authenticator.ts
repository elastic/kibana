/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IBasePath, IClusterClient, LoggerFactory } from 'src/core/server';

import { KibanaRequest } from '../../../../../src/core/server';
import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  AUTH_URL_HASH_QUERY_STRING_PARAMETER,
  LOGOUT_PROVIDER_QUERY_STRING_PARAMETER,
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
  NEXT_URL_QUERY_STRING_PARAMETER,
} from '../../common/constants';
import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticatedUser, AuthenticationProvider } from '../../common/model';
import { shouldProviderUseLoginForm } from '../../common/model';
import type { AuditServiceSetup } from '../audit';
import { accessAgreementAcknowledgedEvent, userLoginEvent, userLogoutEvent } from '../audit';
import type { ConfigType } from '../config';
import { getErrorStatusCode } from '../errors';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session, SessionValue } from '../session_management';
import { AuthenticationResult } from './authentication_result';
import { canRedirectRequest } from './can_redirect_request';
import { DeauthenticationResult } from './deauthentication_result';
import { HTTPAuthorizationHeader } from './http_authentication';
import type {
  AuthenticationProviderOptions,
  AuthenticationProviderSpecificOptions,
  BaseAuthenticationProvider,
} from './providers';
import {
  AnonymousAuthenticationProvider,
  BasicAuthenticationProvider,
  HTTPAuthenticationProvider,
  KerberosAuthenticationProvider,
  OIDCAuthenticationProvider,
  PKIAuthenticationProvider,
  SAMLAuthenticationProvider,
  TokenAuthenticationProvider,
} from './providers';
import { Tokens } from './tokens';

/**
 * List of query string parameters used to pass various authentication related metadata that should
 * be stripped away from URL as soon as they are no longer needed.
 */
const AUTH_METADATA_QUERY_STRING_PARAMETERS = [
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  AUTH_URL_HASH_QUERY_STRING_PARAMETER,
];

/**
 * The shape of the login attempt.
 */
export interface ProviderLoginAttempt {
  /**
   * Name or type of the provider this login attempt is targeted for.
   */
  provider: Pick<AuthenticationProvider, 'name'> | Pick<AuthenticationProvider, 'type'>;

  /**
   * Optional URL to redirect user to after successful login. This URL is ignored if provider
   * decides to redirect user to another URL after login.
   */
  redirectURL?: string;

  /**
   * Login attempt can have any form and defined by the specific provider.
   */
  value: unknown;
}

export interface AuthenticatorOptions {
  audit: AuditServiceSetup;
  featureUsageService: SecurityFeatureUsageServiceStart;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  config: Pick<ConfigType, 'authc'>;
  basePath: IBasePath;
  license: SecurityLicense;
  loggers: LoggerFactory;
  clusterClient: IClusterClient;
  session: PublicMethodsOf<Session>;
  getServerBaseURL: () => string;
}

/** @internal */
interface InvalidateSessionValueParams {
  /** Request instance. */
  request: KibanaRequest;
  /** Value of the existing session, if any. */
  sessionValue: SessionValue | null;
  /** If enabled, skips writing a `user_logout` audit event for this session. */
  skipAuditEvent?: boolean;
}

// Mapping between provider key defined in the config and authentication
// provider class that can handle specific authentication mechanism.
const providerMap = new Map<
  string,
  new (
    options: AuthenticationProviderOptions,
    providerSpecificOptions?: AuthenticationProviderSpecificOptions
  ) => BaseAuthenticationProvider
>([
  [BasicAuthenticationProvider.type, BasicAuthenticationProvider],
  [KerberosAuthenticationProvider.type, KerberosAuthenticationProvider],
  [SAMLAuthenticationProvider.type, SAMLAuthenticationProvider],
  [TokenAuthenticationProvider.type, TokenAuthenticationProvider],
  [OIDCAuthenticationProvider.type, OIDCAuthenticationProvider],
  [PKIAuthenticationProvider.type, PKIAuthenticationProvider],
  [AnonymousAuthenticationProvider.type, AnonymousAuthenticationProvider],
]);

/**
 * The route to the access agreement UI.
 */
const ACCESS_AGREEMENT_ROUTE = '/security/access_agreement';

/**
 * The route to the overwritten session UI.
 */
const OVERWRITTEN_SESSION_ROUTE = '/security/overwritten_session';

function assertRequest(request: KibanaRequest) {
  if (!(request instanceof KibanaRequest)) {
    throw new Error(`Request should be a valid "KibanaRequest" instance, was [${typeof request}].`);
  }
}

function assertLoginAttempt(attempt: ProviderLoginAttempt) {
  if (!isLoginAttemptWithProviderType(attempt) && !isLoginAttemptWithProviderName(attempt)) {
    throw new Error(
      'Login attempt should be an object with non-empty "provider.type" or "provider.name" property.'
    );
  }
}

function isLoginAttemptWithProviderName(
  attempt: unknown
): attempt is { value: unknown; provider: { name: string } } {
  return (
    typeof attempt === 'object' &&
    (attempt as any)?.provider?.name &&
    typeof (attempt as any)?.provider?.name === 'string'
  );
}

function isLoginAttemptWithProviderType(
  attempt: unknown
): attempt is { value: unknown; provider: Pick<AuthenticationProvider, 'type'> } {
  return (
    typeof attempt === 'object' &&
    (attempt as any)?.provider?.type &&
    typeof (attempt as any)?.provider?.type === 'string'
  );
}

function isSessionAuthenticated(sessionValue?: Readonly<SessionValue> | null) {
  return !!sessionValue?.username;
}

/**
 * Instantiates authentication provider based on the provider key from config.
 * @param providerType Provider type key.
 * @param options Options to pass to provider's constructor.
 * @param providerSpecificOptions Options that are specific to {@param providerType}.
 */
function instantiateProvider(
  providerType: string,
  options: AuthenticationProviderOptions,
  providerSpecificOptions?: AuthenticationProviderSpecificOptions
) {
  const ProviderClassName = providerMap.get(providerType);
  if (!ProviderClassName) {
    throw new Error(`Unsupported authentication provider name: ${providerType}.`);
  }

  return new ProviderClassName(options, providerSpecificOptions);
}

/**
 * Authenticator is responsible for authentication of the request using chain of
 * authentication providers. The chain is essentially a prioritized list of configured
 * providers (typically of various types). The order of the list determines the order in
 * which the providers will be consulted. During the authentication process, Authenticator
 * will try to authenticate the request via one provider at a time. Once one of the
 * providers successfully authenticates the request, the authentication is considered
 * to be successful and the authenticated user will be associated with the request.
 * If provider cannot authenticate the request, the next in line provider in the chain
 * will be used. If all providers in the chain could not authenticate the request,
 * the authentication is then considered to be unsuccessful and an authentication error
 * will be returned.
 */
export class Authenticator {
  /**
   * List of configured and instantiated authentication providers.
   */
  private readonly providers: Map<string, BaseAuthenticationProvider>;

  /**
   * Session instance.
   */
  private readonly session: AuthenticatorOptions['session'];

  /**
   * Internal authenticator logger.
   */
  private readonly logger: Logger;

  /**
   * Instantiates Authenticator and bootstrap configured providers.
   * @param options Authenticator options.
   */
  constructor(private readonly options: Readonly<AuthenticatorOptions>) {
    this.session = this.options.session;
    this.logger = this.options.loggers.get('authenticator');

    const providerCommonOptions = {
      client: this.options.clusterClient,
      basePath: this.options.basePath,
      getRequestOriginalURL: this.getRequestOriginalURL.bind(this),
      tokens: new Tokens({
        client: this.options.clusterClient.asInternalUser,
        logger: this.options.loggers.get('tokens'),
      }),
      getServerBaseURL: this.options.getServerBaseURL,
    };

    this.providers = new Map(
      this.options.config.authc.sortedProviders.map(({ type, name }) => {
        this.logger.debug(`Enabling "${name}" (${type}) authentication provider.`);

        return [
          name,
          instantiateProvider(
            type,
            Object.freeze({
              ...providerCommonOptions,
              name,
              logger: options.loggers.get(type, name),
              urls: { loggedOut: (request) => this.getLoggedOutURL(request, type) },
            }),
            this.options.config.authc.providers[type]?.[name]
          ),
        ];
      })
    );

    // For the BWC reasons we always include HTTP authentication provider unless it's explicitly disabled.
    if (this.options.config.authc.http.enabled) {
      this.setupHTTPAuthenticationProvider(
        Object.freeze({
          ...providerCommonOptions,
          name: '__http__',
          logger: options.loggers.get(HTTPAuthenticationProvider.type),
          urls: {
            loggedOut: (request) => this.getLoggedOutURL(request, HTTPAuthenticationProvider.type),
          },
        })
      );
    }

    if (this.providers.size === 0) {
      throw new Error(
        'No authentication provider is configured. Verify `xpack.security.authc.*` config value.'
      );
    }
  }

  /**
   * Performs the initial login request using the provider login attempt description.
   * @param request Request instance.
   * @param attempt Login attempt description.
   */
  async login(request: KibanaRequest, attempt: ProviderLoginAttempt) {
    assertRequest(request);
    assertLoginAttempt(attempt);

    const existingSessionValue = await this.getSessionValue(request);

    // Login attempt can target specific provider by its name (e.g. chosen at the Login Selector UI)
    // or a group of providers with the specified type (e.g. in case of 3rd-party initiated login
    // attempts we may not know what provider exactly can handle that attempt and we have to try
    // every enabled provider of the specified type).
    const providers: Array<[string, BaseAuthenticationProvider]> =
      isLoginAttemptWithProviderName(attempt) && this.providers.has(attempt.provider.name)
        ? [[attempt.provider.name, this.providers.get(attempt.provider.name)!]]
        : isLoginAttemptWithProviderType(attempt)
        ? [...this.providerIterator(existingSessionValue?.provider.name)].filter(
            ([, { type }]) => type === attempt.provider.type
          )
        : [];

    if (providers.length === 0) {
      this.logger.debug(
        `Login attempt for provider with ${
          isLoginAttemptWithProviderName(attempt)
            ? `name ${attempt.provider.name}`
            : `type "${(attempt.provider as Record<string, string>).type}"`
        } is detected, but it isn't enabled.`
      );
      return AuthenticationResult.notHandled();
    }

    for (const [providerName, provider] of providers) {
      // Check if current session has been set by this provider.
      const ownsSession =
        existingSessionValue?.provider.name === providerName &&
        existingSessionValue?.provider.type === provider.type;

      const authenticationResult = await provider.login(
        request,
        attempt.value,
        ownsSession ? existingSessionValue!.state : null
      );

      if (!authenticationResult.notHandled()) {
        const sessionUpdateResult = await this.updateSessionValue(request, {
          provider: { type: provider.type, name: providerName },
          authenticationResult,
          existingSessionValue,
        });

        // Checking for presence of `user` object to determine success state rather than
        // `success()` method since that indicates a successful authentication and `redirect()`
        // could also (but does not always) authenticate a user successfully (e.g. SAML flow)
        if (authenticationResult.user || authenticationResult.failed()) {
          const auditLogger = this.options.audit.asScoped(request);
          auditLogger.log(
            userLoginEvent({
              // We must explicitly specify the sessionId for login events because we just created the session, so
              // it won't automatically get included in the audit event from the request context.
              sessionId: sessionUpdateResult?.value?.sid,
              authenticationResult,
              authenticationProvider: providerName,
              authenticationType: provider.type,
            })
          );
        }

        return this.handlePreAccessRedirects(
          request,
          authenticationResult,
          sessionUpdateResult,
          attempt.redirectURL
        );
      }
    }

    return AuthenticationResult.notHandled();
  }

  /**
   * Performs request authentication using configured chain of authentication providers.
   * @param request Request instance.
   */
  async authenticate(request: KibanaRequest) {
    assertRequest(request);

    const existingSessionValue = await this.getSessionValue(request);
    if (this.shouldRedirectToLoginSelector(request, existingSessionValue)) {
      const providerNameSuggestedByHint = request.url.searchParams.get(
        AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER
      );
      this.logger.debug(
        `Redirecting request to Login Selector (provider hint: ${
          providerNameSuggestedByHint ?? 'n/a'
        }).`
      );
      return AuthenticationResult.redirectTo(
        `${
          this.options.basePath.serverBasePath
        }/login?${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(
          `${this.options.basePath.get(request)}${request.url.pathname}${request.url.search}`
        )}${
          providerNameSuggestedByHint
            ? `&${AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER}=${encodeURIComponent(
                providerNameSuggestedByHint
              )}`
            : ''
        }`
      );
    }

    const suggestedProviderName =
      existingSessionValue?.provider.name ??
      request.url.searchParams.get(AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER);
    for (const [providerName, provider] of this.providerIterator(suggestedProviderName)) {
      // Check if current session has been set by this provider.
      const ownsSession =
        existingSessionValue?.provider.name === providerName &&
        existingSessionValue?.provider.type === provider.type;

      const authenticationResult = await provider.authenticate(
        request,
        ownsSession ? existingSessionValue!.state : null
      );

      if (!authenticationResult.notHandled()) {
        const sessionUpdateResult = await this.updateSessionValue(request, {
          provider: { type: provider.type, name: providerName },
          authenticationResult,
          existingSessionValue,
        });

        return canRedirectRequest(request)
          ? this.handlePreAccessRedirects(request, authenticationResult, sessionUpdateResult)
          : authenticationResult;
      }
    }

    return AuthenticationResult.notHandled();
  }

  /**
   * Tries to reauthenticate request with the existing session.
   * @param request Request instance.
   */
  async reauthenticate(request: KibanaRequest) {
    assertRequest(request);

    const existingSessionValue = await this.getSessionValue(request);
    if (!existingSessionValue) {
      this.logger.warn('Session is no longer available and cannot be re-authenticated.');
      return AuthenticationResult.notHandled();
    }

    // We can ignore `undefined` value here since it's ruled out on the previous step, if provider isn't
    // available then `getSessionValue` should have returned `null`.
    const provider = this.providers.get(existingSessionValue.provider.name)!;
    const authenticationResult = await provider.authenticate(request, existingSessionValue.state);
    if (!authenticationResult.notHandled()) {
      await this.updateSessionValue(request, {
        provider: existingSessionValue.provider,
        authenticationResult,
        existingSessionValue,
      });
    }

    return authenticationResult;
  }

  /**
   * Deauthenticates current request.
   * @param request Request instance.
   */
  async logout(request: KibanaRequest) {
    assertRequest(request);

    const sessionValue = await this.getSessionValue(request);
    const suggestedProviderName =
      sessionValue?.provider.name ??
      request.url.searchParams.get(LOGOUT_PROVIDER_QUERY_STRING_PARAMETER);
    if (suggestedProviderName) {
      await this.invalidateSessionValue({ request, sessionValue });

      // Provider name may be passed in a query param and sourced from the browser's local storage;
      // hence, we can't assume that this provider exists, so we have to check it.
      const provider = this.providers.get(suggestedProviderName);
      if (provider) {
        return provider.logout(request, sessionValue?.state ?? null);
      }
    } else {
      // In case logout is called and we cannot figure out what provider is supposed to handle it,
      // we should iterate through all providers and let them decide if they can perform a logout.
      // This can be necessary if some 3rd-party initiates logout. And even if user doesn't have an
      // active session already some providers can still properly respond to the 3rd-party logout
      // request. For example SAML provider can process logout request encoded in `SAMLRequest`
      // query string parameter.
      for (const [, provider] of this.providerIterator()) {
        const deauthenticationResult = await provider.logout(request);
        if (!deauthenticationResult.notHandled()) {
          return deauthenticationResult;
        }
      }
    }

    // If none of the configured providers could perform a logout, we should redirect user to the
    // default logout location.
    return DeauthenticationResult.redirectTo(this.getLoggedOutURL(request));
  }

  /**
   * Acknowledges access agreement on behalf of the currently authenticated user.
   * @param request Request instance.
   */
  async acknowledgeAccessAgreement(request: KibanaRequest) {
    assertRequest(request);

    const existingSessionValue = await this.getSessionValue(request);
    const currentUser = this.options.getCurrentUser(request);
    if (!existingSessionValue || !currentUser) {
      throw new Error('Cannot acknowledge access agreement for unauthenticated user.');
    }

    if (!this.options.license.getFeatures().allowAccessAgreement) {
      throw new Error('Current license does not allow access agreement acknowledgement.');
    }

    await this.session.update(request, {
      ...existingSessionValue,
      accessAgreementAcknowledged: true,
    });

    const auditLogger = this.options.audit.asScoped(request);
    auditLogger.log(
      accessAgreementAcknowledgedEvent({
        username: currentUser.username,
        provider: existingSessionValue.provider,
      })
    );

    this.options.featureUsageService.recordPreAccessAgreementUsage();
  }

  getRequestOriginalURL(
    request: KibanaRequest,
    additionalQueryStringParameters?: Array<[string, string]>
  ) {
    const originalURLSearchParams = [
      ...[...request.url.searchParams.entries()].filter(
        ([key]) => !AUTH_METADATA_QUERY_STRING_PARAMETERS.includes(key)
      ),
      ...(additionalQueryStringParameters ?? []),
    ];

    return `${this.options.basePath.get(request)}${request.url.pathname}${
      originalURLSearchParams.length > 0
        ? `?${new URLSearchParams(originalURLSearchParams).toString()}`
        : ''
    }`;
  }

  /**
   * Initializes HTTP Authentication provider and appends it to the end of the list of enabled
   * authentication providers.
   * @param options Common provider options.
   */
  private setupHTTPAuthenticationProvider(options: AuthenticationProviderOptions) {
    const supportedSchemes = new Set(
      this.options.config.authc.http.schemes.map((scheme) => scheme.toLowerCase())
    );

    // If `autoSchemesEnabled` is set we should allow schemes that other providers use to
    // authenticate requests with Elasticsearch.
    if (this.options.config.authc.http.autoSchemesEnabled) {
      for (const provider of this.providers.values()) {
        const supportedScheme = provider.getHTTPAuthenticationScheme();
        if (supportedScheme) {
          supportedSchemes.add(supportedScheme.toLowerCase());
        }
      }
    }

    if (this.providers.has(options.name)) {
      throw new Error(`Provider name "${options.name}" is reserved.`);
    }

    this.providers.set(options.name, new HTTPAuthenticationProvider(options, { supportedSchemes }));
  }

  /**
   * Returns provider iterator starting from the suggested provider if any.
   * @param suggestedProviderName Optional name of the provider to return first.
   */
  private *providerIterator(
    suggestedProviderName?: string | null
  ): IterableIterator<[string, BaseAuthenticationProvider]> {
    // If there is no provider suggested or suggested provider isn't configured, let's use the order
    // providers are configured in. Otherwise return suggested provider first, and only then the rest
    // of providers.
    if (!suggestedProviderName || !this.providers.has(suggestedProviderName)) {
      yield* this.providers;
    } else {
      yield [suggestedProviderName, this.providers.get(suggestedProviderName)!];

      for (const [providerName, provider] of this.providers) {
        if (providerName !== suggestedProviderName) {
          yield [providerName, provider];
        }
      }
    }
  }

  /**
   * Extracts session value for the specified request. Under the hood it can clear session if it
   * belongs to the provider that is not available.
   * @param request Request instance.
   */
  private async getSessionValue(request: KibanaRequest) {
    const existingSessionValue = await this.session.get(request);

    // If we detect that for some reason we have a session stored for the provider that is not
    // available anymore (e.g. when user was logged in with one provider, but then configuration has
    // changed and that provider is no longer available), then we should clear session entirely.
    if (
      existingSessionValue &&
      this.providers.get(existingSessionValue.provider.name)?.type !==
        existingSessionValue.provider.type
    ) {
      this.logger.warn(
        `Attempted to retrieve session for the "${existingSessionValue.provider.type}/${existingSessionValue.provider.name}" provider, but it is not configured.`
      );
      await this.invalidateSessionValue({ request, sessionValue: existingSessionValue });
      return null;
    }

    return existingSessionValue;
  }

  /**
   * Updates, creates, extends or clears session value based on the received authentication result.
   * @param request Request instance.
   * @param provider Provider that produced provided authentication result.
   * @param authenticationResult Result of the authentication or login attempt.
   * @param existingSessionValue Value of the existing session if any.
   */
  private async updateSessionValue(
    request: KibanaRequest,
    {
      provider,
      authenticationResult,
      existingSessionValue,
    }: {
      provider: AuthenticationProvider;
      authenticationResult: AuthenticationResult;
      existingSessionValue: Readonly<SessionValue> | null;
    }
  ) {
    if (!existingSessionValue && !authenticationResult.shouldUpdateState()) {
      return null;
    }

    // Provider can specifically ask to clear session by setting it to `null` even if authentication
    // attempt didn't fail.
    if (authenticationResult.shouldClearState()) {
      this.logger.debug('Authentication provider requested to invalidate existing session.');
      await this.invalidateSessionValue({ request, sessionValue: existingSessionValue });
      return null;
    }

    const ownsSession =
      existingSessionValue?.provider.name === provider.name &&
      existingSessionValue?.provider.type === provider.type;

    // If provider owned the session, but failed to authenticate anyway, that likely means that
    // session is not valid and we should clear it. Unexpected errors should not cause session
    // invalidation (e.g. when Elasticsearch is temporarily unavailable).
    if (authenticationResult.failed()) {
      if (ownsSession && getErrorStatusCode(authenticationResult.error) === 401) {
        this.logger.debug('Authentication attempt failed, existing session will be invalidated.');
        await this.invalidateSessionValue({ request, sessionValue: existingSessionValue });
      }
      return null;
    }

    // If authentication succeeds or requires redirect we should automatically extend existing user session,
    // unless authentication has been triggered by a system API request. In case provider explicitly returns new
    // state we should store it in the session regardless of whether it's a system API request or not.
    const sessionShouldBeUpdatedOrExtended =
      (authenticationResult.succeeded() || authenticationResult.redirected()) &&
      (authenticationResult.shouldUpdateState() || (!request.isSystemRequest && ownsSession));
    if (!sessionShouldBeUpdatedOrExtended) {
      return ownsSession ? { value: existingSessionValue, overwritten: false } : null;
    }

    const isExistingSessionAuthenticated = isSessionAuthenticated(existingSessionValue);
    const isNewSessionAuthenticated = !!authenticationResult.user;

    const providerHasChanged = !!existingSessionValue && !ownsSession;
    const sessionHasBeenAuthenticated =
      !!existingSessionValue && !isExistingSessionAuthenticated && isNewSessionAuthenticated;
    const usernameHasChanged =
      isExistingSessionAuthenticated &&
      isNewSessionAuthenticated &&
      authenticationResult.user!.username !== existingSessionValue!.username;

    // There are 3 cases when we SHOULD invalidate existing session and create a new one with
    // regenerated SID/AAD:
    // 1. If a new session must be created while existing is still valid (e.g. IdP initiated login
    // for the user with active session created by another provider).
    // 2. If the existing session was unauthenticated (e.g. intermediate session used during SSO
    // handshake) and can now be turned into an authenticated one.
    // 3. If we re-authenticated user with another username (e.g. during IdP initiated SSO login or
    // when client certificate changes and PKI provider needs to re-authenticate user).
    if (providerHasChanged) {
      this.logger.debug(
        'Authentication provider has changed, existing session will be invalidated.'
      );
      await this.invalidateSessionValue({ request, sessionValue: existingSessionValue });
      existingSessionValue = null;
    } else if (sessionHasBeenAuthenticated) {
      this.logger.debug(
        'Session is authenticated, existing unauthenticated session will be invalidated.'
      );
      await this.invalidateSessionValue({
        request,
        sessionValue: existingSessionValue,
        skipAuditEvent: true, // Skip writing an audit event when we are replacing an intermediate session with a fullly authenticated session
      });
      existingSessionValue = null;
    } else if (usernameHasChanged) {
      this.logger.debug('Username has changed, existing session will be invalidated.');
      await this.invalidateSessionValue({ request, sessionValue: existingSessionValue });
      existingSessionValue = null;
    }

    let newSessionValue;
    if (!existingSessionValue) {
      newSessionValue = await this.session.create(request, {
        username: authenticationResult.user?.username,
        provider,
        state: authenticationResult.shouldUpdateState() ? authenticationResult.state : null,
      });
    } else if (authenticationResult.shouldUpdateState()) {
      newSessionValue = await this.session.update(request, {
        ...existingSessionValue,
        state: authenticationResult.shouldUpdateState()
          ? authenticationResult.state
          : existingSessionValue.state,
      });
    } else {
      newSessionValue = await this.session.extend(request, existingSessionValue);
    }

    return {
      value: newSessionValue,
      // We care only about cases when one authenticated session has been overwritten by another
      // authenticated session that belongs to a different user (different name or provider/realm).
      overwritten:
        isExistingSessionAuthenticated &&
        isNewSessionAuthenticated &&
        (providerHasChanged || usernameHasChanged),
    };
  }

  /**
   * Invalidates session value associated with the specified request.
   */
  private async invalidateSessionValue({
    request,
    sessionValue,
    skipAuditEvent,
  }: InvalidateSessionValueParams) {
    if (sessionValue && !skipAuditEvent) {
      const auditLogger = this.options.audit.asScoped(request);
      auditLogger.log(
        userLogoutEvent({
          username: sessionValue.username,
          provider: sessionValue.provider,
        })
      );
    }

    await this.session.invalidate(request, { match: 'current' });
  }

  /**
   * Checks whether request should be redirected to the Login Selector UI.
   * @param request Request instance.
   * @param sessionValue Current session value if any.
   */
  private shouldRedirectToLoginSelector(request: KibanaRequest, sessionValue: SessionValue | null) {
    // Request should be redirected to Login Selector UI only if all following conditions are met:
    //  1. Request can be redirected (not API call)
    //  2. Request is not authenticated yet
    //  3. Login Selector UI is enabled
    //  4. Request isn't attributed with HTTP Authorization header
    return (
      canRedirectRequest(request) &&
      !isSessionAuthenticated(sessionValue) &&
      this.options.config.authc.selector.enabled &&
      HTTPAuthorizationHeader.parseFromRequest(request) == null
    );
  }

  /**
   * Checks whether request should be redirected to the Access Agreement UI.
   * @param sessionValue Current session value if any.
   */
  private shouldRedirectToAccessAgreement(sessionValue: SessionValue | null) {
    // Request should be redirected to Access Agreement UI only if all following conditions are met:
    //  1. Request can be redirected (not API call)
    //  2. Request is authenticated, but user hasn't acknowledged access agreement in the current
    //     session yet (based on the flag we store in the session)
    //  3. Request is authenticated by the provider that has `accessAgreement` configured
    //  4. Current license allows access agreement
    //  5. And it's not a request to the Access Agreement UI itself
    return (
      sessionValue != null &&
      !sessionValue.accessAgreementAcknowledged &&
      (this.options.config.authc.providers as Record<string, any>)[sessionValue.provider.type]?.[
        sessionValue.provider.name
      ]?.accessAgreement &&
      this.options.license.getFeatures().allowAccessAgreement
    );
  }

  /**
   * In some cases we'd like to redirect user to another page right after successful authentication
   * before they can access anything else in Kibana. This method makes sure we do a proper redirect
   * that would eventually lead user to a initially requested Kibana URL.
   * @param request Request instance.
   * @param authenticationResult Result of the authentication.
   * @param sessionUpdateResult Result of the session update.
   * @param redirectURL
   */
  private handlePreAccessRedirects(
    request: KibanaRequest,
    authenticationResult: AuthenticationResult,
    sessionUpdateResult: { value: Readonly<SessionValue> | null; overwritten: boolean } | null,
    redirectURL?: string
  ) {
    if (
      authenticationResult.failed() ||
      request.url.pathname === ACCESS_AGREEMENT_ROUTE ||
      request.url.pathname === OVERWRITTEN_SESSION_ROUTE
    ) {
      return authenticationResult;
    }

    const isUpdatedSessionAuthenticated = isSessionAuthenticated(sessionUpdateResult?.value);

    let preAccessRedirectURL;
    if (isUpdatedSessionAuthenticated && sessionUpdateResult?.overwritten) {
      this.logger.debug('Redirecting user to the overwritten session UI.');
      preAccessRedirectURL = `${this.options.basePath.serverBasePath}${OVERWRITTEN_SESSION_ROUTE}`;
    } else if (
      isUpdatedSessionAuthenticated &&
      this.shouldRedirectToAccessAgreement(sessionUpdateResult?.value ?? null)
    ) {
      this.logger.debug('Redirecting user to the access agreement UI.');
      preAccessRedirectURL = `${this.options.basePath.serverBasePath}${ACCESS_AGREEMENT_ROUTE}`;
    }

    // If we need to redirect user to anywhere else before they can access Kibana we should remember
    // redirect URL in the `next` parameter. Redirect URL provided in authentication result, if any,
    // always takes precedence over what is specified in `redirectURL` parameter.
    if (preAccessRedirectURL) {
      preAccessRedirectURL = `${preAccessRedirectURL}?${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(
        authenticationResult.redirectURL ||
          redirectURL ||
          `${this.options.basePath.get(request)}${request.url.pathname}${request.url.search}`
      )}`;
    } else if (redirectURL && !authenticationResult.redirectURL) {
      preAccessRedirectURL = redirectURL;
    }

    return preAccessRedirectURL
      ? AuthenticationResult.redirectTo(preAccessRedirectURL, {
          state: authenticationResult.state,
          user: authenticationResult.user,
          authResponseHeaders: authenticationResult.authResponseHeaders,
        })
      : authenticationResult;
  }

  /**
   * Creates a logged out URL for the specified request and provider.
   * @param request Request that initiated logout.
   * @param providerType Type of the provider that handles logout. If not specified, then the first
   * provider in the chain (default) is assumed.
   */
  private getLoggedOutURL(request: KibanaRequest, providerType?: string) {
    // The app that handles logout needs to know the reason of the logout and the URL we may need to
    // redirect user to once they log in again (e.g. when session expires).
    const searchParams = new URLSearchParams();
    for (const [key, defaultValue] of [
      [NEXT_URL_QUERY_STRING_PARAMETER, null],
      [LOGOUT_REASON_QUERY_STRING_PARAMETER, 'LOGGED_OUT'],
    ] as Array<[string, string | null]>) {
      const value = request.url.searchParams.get(key) || defaultValue;
      if (value) {
        searchParams.append(key, value);
      }
    }

    // Query string may contain the path where logout has been called or
    // logout reason that login page may need to know.
    return this.options.config.authc.selector.enabled ||
      (providerType
        ? shouldProviderUseLoginForm(providerType)
        : this.options.config.authc.sortedProviders.length > 0
        ? shouldProviderUseLoginForm(this.options.config.authc.sortedProviders[0].type)
        : false)
      ? `${this.options.basePath.serverBasePath}/login?${searchParams.toString()}`
      : `${this.options.basePath.serverBasePath}/security/logged_out?${searchParams.toString()}`;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  KibanaRequest,
  LoggerFactory,
  ILegacyClusterClient,
  IBasePath,
} from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { AuthenticatedUser } from '../../common/model';
import { AuthenticationProvider } from '../../common/types';
import { SecurityAuditLogger } from '../audit';
import { ConfigType } from '../config';
import { getErrorStatusCode } from '../errors';
import { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { SessionValue, Session } from '../session_management';

import {
  AuthenticationProviderOptions,
  AuthenticationProviderSpecificOptions,
  BaseAuthenticationProvider,
  BasicAuthenticationProvider,
  KerberosAuthenticationProvider,
  SAMLAuthenticationProvider,
  TokenAuthenticationProvider,
  OIDCAuthenticationProvider,
  PKIAuthenticationProvider,
  HTTPAuthenticationProvider,
} from './providers';
import { AuthenticationResult } from './authentication_result';
import { DeauthenticationResult } from './deauthentication_result';
import { Tokens } from './tokens';
import { canRedirectRequest } from './can_redirect_request';
import { HTTPAuthorizationHeader } from './http_authentication';

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
  auditLogger: SecurityAuditLogger;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  config: Pick<ConfigType, 'authc'>;
  basePath: IBasePath;
  license: SecurityLicense;
  loggers: LoggerFactory;
  clusterClient: ILegacyClusterClient;
  session: PublicMethodsOf<Session>;
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
  private readonly session = this.options.session;

  /**
   * Internal authenticator logger.
   */
  private readonly logger = this.options.loggers.get('authenticator');

  /**
   * Instantiates Authenticator and bootstrap configured providers.
   * @param options Authenticator options.
   */
  constructor(private readonly options: Readonly<AuthenticatorOptions>) {
    const providerCommonOptions = {
      client: this.options.clusterClient,
      basePath: this.options.basePath,
      tokens: new Tokens({
        client: this.options.clusterClient,
        logger: this.options.loggers.get('tokens'),
      }),
      urls: {
        loggedOut: options.config.authc.selector.enabled
          ? `${options.basePath.serverBasePath}/login?msg=LOGGED_OUT`
          : `${options.basePath.serverBasePath}/security/logged_out`,
      },
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
        ? [...this.providerIterator(existingSessionValue)].filter(
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
      this.logger.debug('Redirecting request to Login Selector.');
      return AuthenticationResult.redirectTo(
        `${this.options.basePath.serverBasePath}/login?next=${encodeURIComponent(
          `${this.options.basePath.get(request)}${request.url.path}`
        )}`
      );
    }

    for (const [providerName, provider] of this.providerIterator(existingSessionValue)) {
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
   * Deauthenticates current request.
   * @param request Request instance.
   */
  async logout(request: KibanaRequest) {
    assertRequest(request);

    const sessionValue = await this.getSessionValue(request);
    if (sessionValue) {
      await this.session.clear(request);
      return this.providers
        .get(sessionValue.provider.name)!
        .logout(request, sessionValue.state ?? null);
    }

    const queryStringProviderName = (request.query as Record<string, string>)?.provider;
    if (queryStringProviderName) {
      // provider name is passed in a query param and sourced from the browser's local storage;
      // hence, we can't assume that this provider exists, so we have to check it
      const provider = this.providers.get(queryStringProviderName);
      if (provider) {
        return provider.logout(request, null);
      }
    } else {
      // In case logout is called and we cannot figure out what provider is supposed to handle it,
      // we should iterate through all providers and let them decide if they can perform a logout.
      // This can be necessary if some 3rd-party initiates logout. And even if user doesn't have an
      // active session already some providers can still properly respond to the 3rd-party logout
      // request. For example SAML provider can process logout request encoded in `SAMLRequest`
      // query string parameter.
      for (const [, provider] of this.providerIterator(null)) {
        const deauthenticationResult = await provider.logout(request);
        if (!deauthenticationResult.notHandled()) {
          return deauthenticationResult;
        }
      }
    }

    return DeauthenticationResult.notHandled();
  }

  /**
   * Checks whether specified provider type is currently enabled.
   * @param providerType Type of the provider (`basic`, `saml`, `pki` etc.).
   */
  isProviderTypeEnabled(providerType: string) {
    return [...this.providers.values()].some((provider) => provider.type === providerType);
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

    this.options.auditLogger.accessAgreementAcknowledged(
      currentUser.username,
      existingSessionValue.provider
    );

    this.options.getFeatureUsageService().recordPreAccessAgreementUsage();
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
   * Returns provider iterator where providers are sorted in the order of priority (based on the session ownership).
   * @param sessionValue Current session value.
   */
  private *providerIterator(
    sessionValue: SessionValue | null
  ): IterableIterator<[string, BaseAuthenticationProvider]> {
    // If there is no session to predict which provider to use first, let's use the order
    // providers are configured in. Otherwise return provider that owns session first, and only then the rest
    // of providers.
    if (!sessionValue) {
      yield* this.providers;
    } else {
      yield [sessionValue.provider.name, this.providers.get(sessionValue.provider.name)!];

      for (const [providerName, provider] of this.providers) {
        if (providerName !== sessionValue.provider.name) {
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
      await this.session.clear(request);
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
      await this.session.clear(request);
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
        await this.session.clear(request);
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

    const isExistingSessionAuthenticated = !!existingSessionValue?.username;
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
      await this.session.clear(request);
      existingSessionValue = null;
    } else if (sessionHasBeenAuthenticated) {
      this.logger.debug(
        'Session is authenticated, existing unauthenticated session will be invalidated.'
      );
      await this.session.clear(request);
      existingSessionValue = null;
    } else if (usernameHasChanged) {
      this.logger.debug('Username has changed, existing session will be invalidated.');
      await this.session.clear(request);
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
      !sessionValue &&
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

    const isSessionAuthenticated = !!sessionUpdateResult?.value?.username;

    let preAccessRedirectURL;
    if (isSessionAuthenticated && sessionUpdateResult?.overwritten) {
      this.logger.debug('Redirecting user to the overwritten session UI.');
      preAccessRedirectURL = `${this.options.basePath.serverBasePath}${OVERWRITTEN_SESSION_ROUTE}`;
    } else if (
      isSessionAuthenticated &&
      this.shouldRedirectToAccessAgreement(sessionUpdateResult?.value ?? null)
    ) {
      this.logger.debug('Redirecting user to the access agreement UI.');
      preAccessRedirectURL = `${this.options.basePath.serverBasePath}${ACCESS_AGREEMENT_ROUTE}`;
    }

    // If we need to redirect user to anywhere else before they can access Kibana we should remember
    // redirect URL in the `next` parameter. Redirect URL provided in authentication result, if any,
    // always takes precedence over what is specified in `redirectURL` parameter.
    if (preAccessRedirectURL) {
      preAccessRedirectURL = `${preAccessRedirectURL}?next=${encodeURIComponent(
        authenticationResult.redirectURL ||
          redirectURL ||
          `${this.options.basePath.get(request)}${request.url.path}`
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
}

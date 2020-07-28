/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Duration } from 'moment';
import {
  SessionStorageFactory,
  SessionStorage,
  KibanaRequest,
  LoggerFactory,
  Logger,
  HttpServiceSetup,
  ILegacyClusterClient,
} from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { AuthenticatedUser } from '../../common/model';
import { AuthenticationProvider, SessionInfo } from '../../common/types';
import { SecurityAuditLogger } from '../audit';
import { ConfigType } from '../config';
import { getErrorStatusCode } from '../errors';

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
import { SecurityFeatureUsageServiceStart } from '../feature_usage';

/**
 * The shape of the session that is actually stored in the cookie.
 */
export interface ProviderSession {
  /**
   * Name and type of the provider this session belongs to.
   */
  provider: AuthenticationProvider;

  /**
   * The Unix time in ms when the session should be considered expired. If `null`, session will stay
   * active until the browser is closed.
   */
  idleTimeoutExpiration: number | null;

  /**
   * The Unix time in ms which is the max total lifespan of the session. If `null`, session expire
   * time can be extended indefinitely.
   */
  lifespanExpiration: number | null;

  /**
   * Session value that is fed to the authentication provider. The shape is unknown upfront and
   * entirely determined by the authentication provider that owns the current session.
   */
  state: unknown;

  /**
   * Cookie "Path" attribute that is validated against the current Kibana server configuration.
   */
  path: string;

  /**
   * Indicates whether user acknowledged access agreement or not.
   */
  accessAgreementAcknowledged?: boolean;
}

/**
 * The shape of the login attempt.
 */
export interface ProviderLoginAttempt {
  /**
   * Name or type of the provider this login attempt is targeted for.
   */
  provider: Pick<AuthenticationProvider, 'name'> | Pick<AuthenticationProvider, 'type'>;

  /**
   * Login attempt can have any form and defined by the specific provider.
   */
  value: unknown;
}

export interface AuthenticatorOptions {
  auditLogger: SecurityAuditLogger;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  config: Pick<ConfigType, 'session' | 'authc'>;
  basePath: HttpServiceSetup['basePath'];
  license: SecurityLicense;
  loggers: LoggerFactory;
  clusterClient: ILegacyClusterClient;
  sessionStorageFactory: SessionStorageFactory<ProviderSession>;
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
 * Determines if session value was created by the previous Kibana versions which had a different
 * session value format.
 * @param sessionValue The session value to check.
 */
function isLegacyProviderSession(sessionValue: any) {
  return typeof sessionValue?.provider === 'string';
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
   * Which base path the HTTP server is hosted on.
   */
  private readonly serverBasePath: string;

  /**
   * Session timeout in ms. If `null` session will stay active until the browser is closed.
   */
  private readonly idleTimeout: Duration | null = null;

  /**
   * Session max lifespan in ms. If `null` session may live indefinitely.
   */
  private readonly lifespan: Duration | null = null;

  /**
   * Internal authenticator logger.
   */
  private readonly logger: Logger;

  /**
   * Instantiates Authenticator and bootstrap configured providers.
   * @param options Authenticator options.
   */
  constructor(private readonly options: Readonly<AuthenticatorOptions>) {
    this.logger = options.loggers.get('authenticator');

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

    this.serverBasePath = this.options.basePath.serverBasePath || '/';

    this.idleTimeout = this.options.config.session.idleTimeout;
    this.lifespan = this.options.config.session.lifespan;
  }

  /**
   * Performs the initial login request using the provider login attempt description.
   * @param request Request instance.
   * @param attempt Login attempt description.
   */
  async login(request: KibanaRequest, attempt: ProviderLoginAttempt) {
    assertRequest(request);
    assertLoginAttempt(attempt);

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const existingSession = await this.getSessionValue(sessionStorage);

    // Login attempt can target specific provider by its name (e.g. chosen at the Login Selector UI)
    // or a group of providers with the specified type (e.g. in case of 3rd-party initiated login
    // attempts we may not know what provider exactly can handle that attempt and we have to try
    // every enabled provider of the specified type).
    const providers: Array<[string, BaseAuthenticationProvider]> =
      isLoginAttemptWithProviderName(attempt) && this.providers.has(attempt.provider.name)
        ? [[attempt.provider.name, this.providers.get(attempt.provider.name)!]]
        : isLoginAttemptWithProviderType(attempt)
        ? [...this.providerIterator(existingSession)].filter(
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
        existingSession?.provider.name === providerName &&
        existingSession?.provider.type === provider.type;

      const authenticationResult = await provider.login(
        request,
        attempt.value,
        ownsSession ? existingSession!.state : null
      );

      this.updateSessionValue(sessionStorage, {
        provider: { type: provider.type, name: providerName },
        isSystemRequest: request.isSystemRequest,
        authenticationResult,
        existingSession: ownsSession ? existingSession : null,
      });

      if (!authenticationResult.notHandled()) {
        return authenticationResult;
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

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const existingSession = await this.getSessionValue(sessionStorage);

    if (this.shouldRedirectToLoginSelector(request, existingSession)) {
      this.logger.debug('Redirecting request to Login Selector.');
      return AuthenticationResult.redirectTo(
        `${this.options.basePath.serverBasePath}/login?next=${encodeURIComponent(
          `${this.options.basePath.get(request)}${request.url.path}`
        )}`
      );
    }

    for (const [providerName, provider] of this.providerIterator(existingSession)) {
      // Check if current session has been set by this provider.
      const ownsSession =
        existingSession?.provider.name === providerName &&
        existingSession?.provider.type === provider.type;

      const authenticationResult = await provider.authenticate(
        request,
        ownsSession ? existingSession!.state : null
      );

      const updatedSession = this.updateSessionValue(sessionStorage, {
        provider: { type: provider.type, name: providerName },
        isSystemRequest: request.isSystemRequest,
        authenticationResult,
        existingSession: ownsSession ? existingSession : null,
      });

      if (!authenticationResult.notHandled()) {
        if (
          authenticationResult.succeeded() &&
          this.shouldRedirectToAccessAgreement(request, updatedSession)
        ) {
          this.logger.debug('Redirecting user to the access agreement screen.');
          return AuthenticationResult.redirectTo(
            `${
              this.options.basePath.serverBasePath
            }${ACCESS_AGREEMENT_ROUTE}?next=${encodeURIComponent(
              `${this.options.basePath.get(request)}${request.url.path}`
            )}`
          );
        }

        return authenticationResult;
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

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const sessionValue = await this.getSessionValue(sessionStorage);
    if (sessionValue) {
      sessionStorage.clear();

      return this.providers.get(sessionValue.provider.name)!.logout(request, sessionValue.state);
    }

    const providerName = this.getProviderName(request.query);
    if (providerName) {
      // provider name is passed in a query param and sourced from the browser's local storage;
      // hence, we can't assume that this provider exists, so we have to check it
      const provider = this.providers.get(providerName);
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
   * Returns session information for the current request.
   * @param request Request instance.
   */
  async getSessionInfo(request: KibanaRequest): Promise<SessionInfo | null> {
    assertRequest(request);

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const sessionValue = await this.getSessionValue(sessionStorage);

    if (sessionValue) {
      // We can't rely on the client's system clock, so in addition to returning expiration timestamps, we also return
      // the current server time -- that way the client can calculate the relative time to expiration.
      return {
        now: Date.now(),
        idleTimeoutExpiration: sessionValue.idleTimeoutExpiration,
        lifespanExpiration: sessionValue.lifespanExpiration,
        provider: sessionValue.provider,
      };
    }
    return null;
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

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const existingSession = await this.getSessionValue(sessionStorage);
    const currentUser = this.options.getCurrentUser(request);
    if (!existingSession || !currentUser) {
      throw new Error('Cannot acknowledge access agreement for unauthenticated user.');
    }

    if (!this.options.license.getFeatures().allowAccessAgreement) {
      throw new Error('Current license does not allow access agreement acknowledgement.');
    }

    sessionStorage.set({ ...existingSession, accessAgreementAcknowledged: true });

    this.options.auditLogger.accessAgreementAcknowledged(
      currentUser.username,
      existingSession.provider
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
    sessionValue: ProviderSession | null
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
   * Extracts session value for the specified request. Under the hood it can
   * clear session if it belongs to the provider that is not available.
   * @param sessionStorage Session storage instance.
   */
  private async getSessionValue(sessionStorage: SessionStorage<ProviderSession>) {
    const sessionValue = await sessionStorage.get();

    // If we detect that session is in incompatible format or for some reason we have a session
    // stored for the provider that is not available anymore (e.g. when user was logged in with one
    // provider, but then configuration has changed and that provider is no longer available), then
    // we should clear session entirely.
    if (
      sessionValue &&
      (isLegacyProviderSession(sessionValue) ||
        this.providers.get(sessionValue.provider.name)?.type !== sessionValue.provider.type)
    ) {
      sessionStorage.clear();
      return null;
    }

    return sessionValue;
  }

  private updateSessionValue(
    sessionStorage: SessionStorage<ProviderSession>,
    {
      provider,
      authenticationResult,
      existingSession,
      isSystemRequest,
    }: {
      provider: AuthenticationProvider;
      authenticationResult: AuthenticationResult;
      existingSession: ProviderSession | null;
      isSystemRequest: boolean;
    }
  ) {
    if (!existingSession && !authenticationResult.shouldUpdateState()) {
      return null;
    }

    // If authentication succeeds or requires redirect we should automatically extend existing user session,
    // unless authentication has been triggered by a system API request. In case provider explicitly returns new
    // state we should store it in the session regardless of whether it's a system API request or not.
    const sessionCanBeUpdated =
      (authenticationResult.succeeded() || authenticationResult.redirected()) &&
      (authenticationResult.shouldUpdateState() || !isSystemRequest);

    // If provider owned the session, but failed to authenticate anyway, that likely means that
    // session is not valid and we should clear it. Also provider can specifically ask to clear
    // session by setting it to `null` even if authentication attempt didn't fail.
    if (
      authenticationResult.shouldClearState() ||
      (authenticationResult.failed() && getErrorStatusCode(authenticationResult.error) === 401)
    ) {
      sessionStorage.clear();
      return null;
    }

    if (sessionCanBeUpdated) {
      const { idleTimeoutExpiration, lifespanExpiration } = this.calculateExpiry(existingSession);
      const updatedSession = {
        state: authenticationResult.shouldUpdateState()
          ? authenticationResult.state
          : existingSession!.state,
        provider,
        idleTimeoutExpiration,
        lifespanExpiration,
        path: this.serverBasePath,
        accessAgreementAcknowledged: existingSession?.accessAgreementAcknowledged,
      };
      sessionStorage.set(updatedSession);
      return updatedSession;
    }

    return existingSession;
  }

  private getProviderName(query: any): string | null {
    if (query && query.provider && typeof query.provider === 'string') {
      return query.provider;
    }
    return null;
  }

  private calculateExpiry(
    existingSession: ProviderSession | null
  ): { idleTimeoutExpiration: number | null; lifespanExpiration: number | null } {
    const now = Date.now();
    // if we are renewing an existing session, use its `lifespanExpiration` -- otherwise, set this value
    // based on the configured server `lifespan`.
    // note, if the server had a `lifespan` set and then removes it, remove `lifespanExpiration` on renewed sessions
    // also, if the server did not have a `lifespan` set and then adds it, add `lifespanExpiration` on renewed sessions
    const lifespanExpiration =
      existingSession?.lifespanExpiration && this.lifespan
        ? existingSession.lifespanExpiration
        : this.lifespan && now + this.lifespan.asMilliseconds();
    const idleTimeoutExpiration = this.idleTimeout && now + this.idleTimeout.asMilliseconds();

    return { idleTimeoutExpiration, lifespanExpiration };
  }

  /**
   * Checks whether request should be redirected to the Login Selector UI.
   * @param request Request instance.
   * @param session Current session value if any.
   */
  private shouldRedirectToLoginSelector(request: KibanaRequest, session: ProviderSession | null) {
    // Request should be redirected to Login Selector UI only if all following conditions are met:
    //  1. Request can be redirected (not API call)
    //  2. Request is not authenticated yet
    //  3. Login Selector UI is enabled
    //  4. Request isn't attributed with HTTP Authorization header
    return (
      canRedirectRequest(request) &&
      !session &&
      this.options.config.authc.selector.enabled &&
      HTTPAuthorizationHeader.parseFromRequest(request) == null
    );
  }

  /**
   * Checks whether request should be redirected to the Access Agreement UI.
   * @param request Request instance.
   * @param session Current session value if any.
   */
  private shouldRedirectToAccessAgreement(request: KibanaRequest, session: ProviderSession | null) {
    // Request should be redirected to Access Agreement UI only if all following conditions are met:
    //  1. Request can be redirected (not API call)
    //  2. Request is authenticated, but user hasn't acknowledged access agreement in the current
    //     session yet (based on the flag we store in the session)
    //  3. Request is authenticated by the provider that has `accessAgreement` configured
    //  4. Current license allows access agreement
    //  5. And it's not a request to the Access Agreement UI itself
    return (
      canRedirectRequest(request) &&
      session != null &&
      !session.accessAgreementAcknowledged &&
      (this.options.config.authc.providers as Record<string, any>)[session.provider.type]?.[
        session.provider.name
      ]?.accessAgreement &&
      this.options.license.getFeatures().allowAccessAgreement &&
      request.url.pathname !== ACCESS_AGREEMENT_ROUTE
    );
  }
}

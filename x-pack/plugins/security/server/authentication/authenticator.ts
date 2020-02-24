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
  IClusterClient,
} from '../../../../../src/core/server';
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
  isSAMLRequestQuery,
} from './providers';
import { AuthenticationResult } from './authentication_result';
import { DeauthenticationResult } from './deauthentication_result';
import { Tokens } from './tokens';
import { SessionInfo } from '../../public';

/**
 * The shape of the session that is actually stored in the cookie.
 */
export interface ProviderSession {
  /**
   * Name/type of the provider this session belongs to.
   */
  provider: string;

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
}

/**
 * The shape of the login attempt.
 */
export interface ProviderLoginAttempt {
  /**
   * Name/type of the provider this login attempt is targeted for.
   */
  provider: string;

  /**
   * Login attempt can have any form and defined by the specific provider.
   */
  value: unknown;
}

export interface AuthenticatorOptions {
  config: Pick<ConfigType, 'session' | 'authc'>;
  basePath: HttpServiceSetup['basePath'];
  loggers: LoggerFactory;
  clusterClient: IClusterClient;
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

function assertRequest(request: KibanaRequest) {
  if (!(request instanceof KibanaRequest)) {
    throw new Error(`Request should be a valid "KibanaRequest" instance, was [${typeof request}].`);
  }
}

function assertLoginAttempt(attempt: ProviderLoginAttempt) {
  if (!attempt || !attempt.provider || typeof attempt.provider !== 'string') {
    throw new Error('Login attempt should be an object with non-empty "provider" property.');
  }
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
    };

    const authProviders = this.options.config.authc.providers;
    if (authProviders.length === 0) {
      throw new Error(
        'No authentication provider is configured. Verify `xpack.security.authc.providers` config value.'
      );
    }

    this.providers = new Map(
      authProviders.map(providerType => {
        const providerSpecificOptions = this.options.config.authc.hasOwnProperty(providerType)
          ? (this.options.config.authc as Record<string, any>)[providerType]
          : undefined;

        return [
          providerType,
          instantiateProvider(
            providerType,
            Object.freeze({ ...providerCommonOptions, logger: options.loggers.get(providerType) }),
            providerSpecificOptions
          ),
        ] as [string, BaseAuthenticationProvider];
      })
    );
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

    // If there is an attempt to login with a provider that isn't enabled, we should fail.
    const provider = this.providers.get(attempt.provider);
    if (provider === undefined) {
      this.logger.debug(
        `Login attempt for provider "${attempt.provider}" is detected, but it isn't enabled.`
      );
      return AuthenticationResult.notHandled();
    }

    this.logger.debug(`Performing login using "${attempt.provider}" provider.`);

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);

    // If we detect an existing session that belongs to a different provider than the one requested
    // to perform a login we should clear such session.
    let existingSession = await this.getSessionValue(sessionStorage);
    if (existingSession && existingSession.provider !== attempt.provider) {
      this.logger.debug(
        `Clearing existing session of another ("${existingSession.provider}") provider.`
      );
      sessionStorage.clear();
      existingSession = null;
    }

    const authenticationResult = await provider.login(
      request,
      attempt.value,
      existingSession && existingSession.state
    );

    // There are two possible cases when we'd want to clear existing state:
    // 1. If provider owned the state (e.g. intermediate state used for multi step login), but failed
    // to login, that likely means that state is not valid anymore and we should clear it.
    // 2. Also provider can specifically ask to clear state by setting it to `null` even if
    // authentication attempt didn't fail (e.g. custom realm could "pin" client/request identity to
    // a server-side only session established during multi step login that relied on intermediate
    // client-side state which isn't needed anymore).
    const shouldClearSession =
      authenticationResult.shouldClearState() ||
      (authenticationResult.failed() && getErrorStatusCode(authenticationResult.error) === 401);
    if (existingSession && shouldClearSession) {
      sessionStorage.clear();
    } else if (authenticationResult.shouldUpdateState()) {
      const { idleTimeoutExpiration, lifespanExpiration } = this.calculateExpiry(existingSession);
      sessionStorage.set({
        state: authenticationResult.state,
        provider: attempt.provider,
        idleTimeoutExpiration,
        lifespanExpiration,
        path: this.serverBasePath,
      });
    }

    return authenticationResult;
  }

  /**
   * Performs request authentication using configured chain of authentication providers.
   * @param request Request instance.
   */
  async authenticate(request: KibanaRequest) {
    assertRequest(request);

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const existingSession = await this.getSessionValue(sessionStorage);

    let authenticationResult = AuthenticationResult.notHandled();
    for (const [providerType, provider] of this.providerIterator(existingSession)) {
      // Check if current session has been set by this provider.
      const ownsSession = existingSession && existingSession.provider === providerType;

      authenticationResult = await provider.authenticate(
        request,
        ownsSession ? existingSession!.state : null
      );

      this.updateSessionValue(sessionStorage, {
        providerType,
        isSystemRequest: request.isSystemRequest,
        authenticationResult,
        existingSession: ownsSession ? existingSession : null,
      });

      if (
        authenticationResult.failed() ||
        authenticationResult.succeeded() ||
        authenticationResult.redirected()
      ) {
        return authenticationResult;
      }
    }

    return authenticationResult;
  }

  /**
   * Deauthenticates current request.
   * @param request Request instance.
   */
  async logout(request: KibanaRequest) {
    assertRequest(request);

    const sessionStorage = this.options.sessionStorageFactory.asScoped(request);
    const sessionValue = await this.getSessionValue(sessionStorage);
    const providerName = this.getProviderName(request.query);
    if (sessionValue) {
      sessionStorage.clear();

      return this.providers.get(sessionValue.provider)!.logout(request, sessionValue.state);
    } else if (providerName) {
      // provider name is passed in a query param and sourced from the browser's local storage;
      // hence, we can't assume that this provider exists, so we have to check it
      const provider = this.providers.get(providerName);
      if (provider) {
        return provider.logout(request, null);
      }
    }

    // Normally when there is no active session in Kibana, `logout` method shouldn't do anything
    // and user will eventually be redirected to the home page to log in. But if SAML is supported there
    // is a special case when logout is initiated by the IdP or another SP, then IdP will request _every_
    // SP associated with the current user session to do the logout. So if Kibana (without active session)
    // receives such a request it shouldn't redirect user to the home page, but rather redirect back to IdP
    // with correct logout response and only Elasticsearch knows how to do that.
    if (isSAMLRequestQuery(request.query) && this.providers.has('saml')) {
      return this.providers.get('saml')!.logout(request);
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
      yield [sessionValue.provider, this.providers.get(sessionValue.provider)!];

      for (const [providerType, provider] of this.providers) {
        if (providerType !== sessionValue.provider) {
          yield [providerType, provider];
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
    let sessionValue = await sessionStorage.get();

    // If for some reason we have a session stored for the provider that is not available
    // (e.g. when user was logged in with one provider, but then configuration has changed
    // and that provider is no longer available), then we should clear session entirely.
    if (sessionValue && !this.providers.has(sessionValue.provider)) {
      sessionStorage.clear();
      sessionValue = null;
    }

    return sessionValue;
  }

  private updateSessionValue(
    sessionStorage: SessionStorage<ProviderSession>,
    {
      providerType,
      authenticationResult,
      existingSession,
      isSystemRequest,
    }: {
      providerType: string;
      authenticationResult: AuthenticationResult;
      existingSession: ProviderSession | null;
      isSystemRequest: boolean;
    }
  ) {
    if (!existingSession && !authenticationResult.shouldUpdateState()) {
      return;
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
    } else if (sessionCanBeUpdated) {
      const { idleTimeoutExpiration, lifespanExpiration } = this.calculateExpiry(existingSession);
      sessionStorage.set({
        state: authenticationResult.shouldUpdateState()
          ? authenticationResult.state
          : existingSession!.state,
        provider: providerType,
        idleTimeoutExpiration,
        lifespanExpiration,
        path: this.serverBasePath,
      });
    }
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
}

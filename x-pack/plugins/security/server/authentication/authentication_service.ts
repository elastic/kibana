/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  ElasticsearchServiceSetup,
  HttpServiceSetup,
  HttpServiceStart,
  IClusterClient,
  KibanaRequest,
  Logger,
  LoggerFactory,
} from 'src/core/server';

import type { AuthenticatedUser, SecurityLicense } from '../../common';
import { NEXT_URL_QUERY_STRING_PARAMETER } from '../../common/constants';
import { shouldProviderUseLoginForm } from '../../common/model';
import type { AuditServiceSetup } from '../audit';
import type { ConfigType } from '../config';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { ROUTE_TAG_AUTH_FLOW } from '../routes/tags';
import type { Session } from '../session_management';
import { APIKeys } from './api_keys';
import type { AuthenticationResult } from './authentication_result';
import type { ProviderLoginAttempt } from './authenticator';
import { Authenticator } from './authenticator';
import { canRedirectRequest } from './can_redirect_request';
import type { DeauthenticationResult } from './deauthentication_result';
import { renderUnauthenticatedPage } from './unauthenticated_page';

interface AuthenticationServiceSetupParams {
  http: Pick<HttpServiceSetup, 'basePath' | 'csp' | 'registerAuth' | 'registerOnPreResponse'>;
  elasticsearch: Pick<ElasticsearchServiceSetup, 'setUnauthorizedErrorHandler'>;
  config: ConfigType;
  license: SecurityLicense;
  buildNumber: number;
}

interface AuthenticationServiceStartParams {
  http: Pick<HttpServiceStart, 'auth' | 'basePath' | 'getServerInfo'>;
  config: ConfigType;
  clusterClient: IClusterClient;
  audit: AuditServiceSetup;
  featureUsageService: SecurityFeatureUsageServiceStart;
  session: PublicMethodsOf<Session>;
  loggers: LoggerFactory;
}

export interface InternalAuthenticationServiceStart extends AuthenticationServiceStart {
  apiKeys: Pick<
    APIKeys,
    | 'areAPIKeysEnabled'
    | 'create'
    | 'invalidate'
    | 'grantAsInternalUser'
    | 'invalidateAsInternalUser'
  >;
  login: (request: KibanaRequest, attempt: ProviderLoginAttempt) => Promise<AuthenticationResult>;
  logout: (request: KibanaRequest) => Promise<DeauthenticationResult>;
  acknowledgeAccessAgreement: (request: KibanaRequest) => Promise<void>;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}

/**
 * Authentication services available on the security plugin's start contract.
 */
export interface AuthenticationServiceStart {
  apiKeys: Pick<
    APIKeys,
    | 'areAPIKeysEnabled'
    | 'create'
    | 'invalidate'
    | 'grantAsInternalUser'
    | 'invalidateAsInternalUser'
  >;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}

export class AuthenticationService {
  private license!: SecurityLicense;
  private authenticator?: Authenticator;
  private session?: PublicMethodsOf<Session>;

  constructor(private readonly logger: Logger) {}

  setup({ config, http, license, buildNumber, elasticsearch }: AuthenticationServiceSetupParams) {
    this.license = license;

    // If we cannot automatically authenticate users we should redirect them straight to the login
    // page if possible, so that they can try other methods to log in. If not possible, we should
    // render a dedicated `Unauthenticated` page from which users can explicitly trigger a new
    // login attempt. There are two cases when we can redirect to the login page:
    // 1. Login selector is enabled
    // 2. Login selector is disabled, but the provider with the lowest `order` uses login form
    const isLoginPageAvailable =
      config.authc.selector.enabled ||
      (config.authc.sortedProviders.length > 0 &&
        shouldProviderUseLoginForm(config.authc.sortedProviders[0].type));

    http.registerAuth(async (request, response, t) => {
      if (!license.isLicenseAvailable()) {
        this.logger.error('License is not available, authentication is not possible.');
        return response.customError({
          body: 'License is not available.',
          statusCode: 503,
          headers: { 'Retry-After': '30' },
        });
      }

      // If security is disabled, then continue with no user credentials.
      if (!license.isEnabled()) {
        this.logger.debug(
          'Current license does not support any security features, authentication is not needed.'
        );
        return t.authenticated();
      }

      if (!this.authenticator) {
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return response.customError({
          body: 'Authentication sub-system is not fully initialized yet.',
          statusCode: 503,
          headers: { 'Retry-After': '30' },
        });
      }

      const authenticationResult = await this.authenticator.authenticate(request);

      if (authenticationResult.succeeded()) {
        return t.authenticated({
          state: authenticationResult.user,
          requestHeaders: authenticationResult.authHeaders,
          responseHeaders: authenticationResult.authResponseHeaders,
        });
      }

      if (authenticationResult.redirected()) {
        // Some authentication mechanisms may require user to be redirected to another location to
        // initiate or complete authentication flow. It can be Kibana own login page for basic
        // authentication (username and password) or arbitrary external page managed by 3rd party
        // Identity Provider for SSO authentication mechanisms. Authentication provider is the one who
        // decides what location user should be redirected to.
        return t.redirected({
          location: authenticationResult.redirectURL!,
          ...(authenticationResult.authResponseHeaders || {}),
        });
      }

      if (authenticationResult.failed()) {
        const error = authenticationResult.error!;
        this.logger.info(`Authentication attempt failed: ${getDetailedErrorMessage(error)}`);

        // proxy Elasticsearch "native" errors
        const statusCode = getErrorStatusCode(error);
        if (typeof statusCode === 'number') {
          return response.customError({
            body: error,
            statusCode,
            headers: authenticationResult.authResponseHeaders,
          });
        }

        return response.unauthorized({
          headers: authenticationResult.authResponseHeaders,
        });
      }

      this.logger.debug('Could not handle authentication attempt');
      return t.notHandled();
    });

    http.registerOnPreResponse(async (request, preResponse, toolkit) => {
      if (preResponse.statusCode !== 401 || !canRedirectRequest(request)) {
        return toolkit.next();
      }

      if (!this.authenticator) {
        // Core doesn't allow returning error here.
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return toolkit.next();
      }

      // If users can eventually re-login we want to redirect them directly to the page they tried
      // to access initially, but we only want to do that for routes that aren't part of the various
      // authentication flows that wouldn't make any sense after successful authentication.
      const originalURL = !request.route.options.tags.includes(ROUTE_TAG_AUTH_FLOW)
        ? this.authenticator.getRequestOriginalURL(request)
        : `${http.basePath.get(request)}/`;
      if (!isLoginPageAvailable) {
        return toolkit.render({
          body: renderUnauthenticatedPage({ buildNumber, basePath: http.basePath, originalURL }),
          headers: { 'Content-Security-Policy': http.csp.header },
        });
      }

      const needsToLogout = (await this.session?.getSID(request)) !== undefined;
      if (needsToLogout) {
        this.logger.warn('Could not authenticate user with the existing session. Forcing logout.');
      }

      return toolkit.render({
        body: '<div/>',
        headers: {
          'Content-Security-Policy': http.csp.header,
          Refresh: `0;url=${http.basePath.prepend(
            `${
              needsToLogout ? '/logout' : '/login'
            }?msg=UNAUTHENTICATED&${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(
              originalURL
            )}`
          )}`,
        },
      });
    });

    elasticsearch.setUnauthorizedErrorHandler(async ({ error, request }, toolkit) => {
      if (!this.authenticator) {
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return toolkit.notHandled();
      }

      if (!license.isLicenseAvailable() || !license.isEnabled()) {
        this.logger.error(
          `License is not available or does not support security features, re-authentication is not possible (available: ${license.isLicenseAvailable()}, enabled: ${license.isEnabled()}).`
        );
        return toolkit.notHandled();
      }

      if (getErrorStatusCode(error) !== 401) {
        this.logger.error(
          `Re-authentication is not possible for the following error: ${getDetailedErrorMessage(
            error
          )}.`
        );
        return toolkit.notHandled();
      }

      this.logger.debug(
        `Re-authenticating request due to error: ${getDetailedErrorMessage(error)}`
      );

      let authenticationResult;
      const originalHeaders = request.headers;
      try {
        // WORKAROUND: Due to BWC reasons Core mutates headers of the original request with authentication
        // headers returned during authentication stage. We should remove these headers before re-authentication to not
        // conflict with the HTTP authentication logic. Performance impact is negligible since this is not a hot path.
        (request.headers as Record<string, unknown>) = Object.fromEntries(
          Object.entries(originalHeaders).filter(
            ([headerName]) => headerName.toLowerCase() !== 'authorization'
          )
        );
        authenticationResult = await this.authenticator.reauthenticate(request);
      } catch (err) {
        this.logger.error(
          `Re-authentication failed due to unexpected error: ${getDetailedErrorMessage(err)}.`
        );
        throw err;
      } finally {
        (request.headers as Record<string, unknown>) = originalHeaders;
      }

      if (authenticationResult.succeeded()) {
        if (authenticationResult.authHeaders) {
          this.logger.debug('Re-authentication succeeded');
          return toolkit.retry({ authHeaders: authenticationResult.authHeaders });
        }

        this.logger.error(
          'Re-authentication succeeded, but authentication headers are not available.'
        );
      } else if (authenticationResult.failed()) {
        this.logger.error(
          `Re-authentication failed due to: ${getDetailedErrorMessage(authenticationResult.error)}`
        );
      } else if (authenticationResult.redirected()) {
        this.logger.error('Re-authentication failed since redirect is required.');
      } else {
        this.logger.error('Re-authentication cannot be handled.');
      }

      return toolkit.notHandled();
    });
  }

  start({
    audit,
    config,
    clusterClient,
    featureUsageService,
    http,
    loggers,
    session,
  }: AuthenticationServiceStartParams): InternalAuthenticationServiceStart {
    const apiKeys = new APIKeys({
      clusterClient,
      logger: this.logger.get('api-key'),
      license: this.license,
    });

    /**
     * Retrieves server protocol name/host name/port and merges it with `xpack.security.public` config
     * to construct a server base URL (deprecated, used by the SAML provider only).
     */
    const getServerBaseURL = () => {
      const { protocol, hostname, port } = http.getServerInfo();
      const serverConfig = { protocol, hostname, port, ...config.public };

      return `${serverConfig.protocol}://${serverConfig.hostname}:${serverConfig.port}`;
    };

    const getCurrentUser = (request: KibanaRequest) =>
      http.auth.get<AuthenticatedUser>(request).state ?? null;

    this.session = session;
    this.authenticator = new Authenticator({
      audit,
      loggers,
      clusterClient,
      basePath: http.basePath,
      config: { authc: config.authc },
      getCurrentUser,
      featureUsageService,
      getServerBaseURL,
      license: this.license,
      session,
    });

    return {
      apiKeys: {
        areAPIKeysEnabled: apiKeys.areAPIKeysEnabled.bind(apiKeys),
        create: apiKeys.create.bind(apiKeys),
        grantAsInternalUser: apiKeys.grantAsInternalUser.bind(apiKeys),
        invalidate: apiKeys.invalidate.bind(apiKeys),
        invalidateAsInternalUser: apiKeys.invalidateAsInternalUser.bind(apiKeys),
      },

      login: this.authenticator.login.bind(this.authenticator),
      logout: this.authenticator.logout.bind(this.authenticator),
      acknowledgeAccessAgreement: this.authenticator.acknowledgeAccessAgreement.bind(
        this.authenticator
      ),

      /**
       * Retrieves currently authenticated user associated with the specified request.
       * @param request
       */
      getCurrentUser,
    };
  }
}

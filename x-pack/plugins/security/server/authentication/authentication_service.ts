/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  HttpServiceSetup,
  HttpServiceStart,
  IClusterClient,
  KibanaRequest,
  Logger,
  LoggerFactory,
} from 'src/core/server';

import { NEXT_URL_QUERY_STRING_PARAMETER } from '../../common/constants';
import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticatedUser } from '../../common/model';
import { shouldProviderUseLoginForm } from '../../common/model';
import type { AuditServiceSetup, SecurityAuditLogger } from '../audit';
import type { ConfigType } from '../config';
import { getErrorStatusCode } from '../errors';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import { APIKeys } from './api_keys';
import type { AuthenticationResult } from './authentication_result';
import type { ProviderLoginAttempt } from './authenticator';
import { Authenticator } from './authenticator';
import { API_ROUTES_SUPPORTING_REDIRECTS, canRedirectRequest } from './can_redirect_request';
import type { DeauthenticationResult } from './deauthentication_result';

interface AuthenticationServiceSetupParams {
  http: Pick<HttpServiceSetup, 'basePath' | 'csp' | 'registerAuth' | 'registerOnPreResponse'>;
  config: ConfigType;
  license: SecurityLicense;
}

interface AuthenticationServiceStartParams {
  http: Pick<HttpServiceStart, 'auth' | 'basePath'>;
  config: ConfigType;
  clusterClient: IClusterClient;
  legacyAuditLogger: SecurityAuditLogger;
  audit: AuditServiceSetup;
  featureUsageService: SecurityFeatureUsageServiceStart;
  session: PublicMethodsOf<Session>;
  loggers: LoggerFactory;
}

export interface AuthenticationServiceStart {
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

export class AuthenticationService {
  private license!: SecurityLicense;
  private authenticator?: Authenticator;

  constructor(private readonly logger: Logger) {}

  setup({ config, http, license }: AuthenticationServiceSetupParams) {
    this.license = license;

    // If we cannot automatically authenticate users we should redirect them straight to the login
    // page if possible, so that they can try other methods to log in. If not possible, we should
    // redirect to a dedicated `Unauthorized` page from which users can explicitly trigger a new
    // login attempt. There are two cases when we can redirect to the login page:
    // 1. Login selector is enabled
    // 2. Login selector is disabled, but the provider with the lowest `order` uses login form
    const unauthorizedURL = http.basePath.prepend(
      config.authc.selector.enabled ||
        shouldProviderUseLoginForm(config.authc.sortedProviders[0].type)
        ? '/login'
        : '/security/unauthorized'
    );

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
        this.logger.info(`Authentication attempt failed: ${authenticationResult.error!.message}`);
        const error = authenticationResult.error!;
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

    http.registerOnPreResponse((request, preResponse, toolkit) => {
      if (preResponse.statusCode !== 401 || !canRedirectRequest(request)) {
        return toolkit.next();
      }

      if (!this.authenticator) {
        // Core doesn't allow returning error here.
        this.logger.error('Authentication sub-system is not fully initialized yet.');
        return toolkit.next();
      }

      // If users can eventually re-login we want to redirect them directly to the page they tried
      // to access initially, but we only want to do that for non-API routes. API routes that support
      // redirects are solely used to support various authentication flows that wouldn't make any
      // sense after successful authentication through login page.
      const urlToRedirectToAfterLogin = !API_ROUTES_SUPPORTING_REDIRECTS.includes(
        request.route.path
      )
        ? `${NEXT_URL_QUERY_STRING_PARAMETER}=${encodeURIComponent(
            this.authenticator.getRequestOriginalURL(request)
          )}`
        : '';

      return toolkit.render({
        body: `
          <html lang=${i18n.getLocale()}>
            <head>
              <title>Unauthorized</title>
              <link rel="icon" href="data:," />
              <meta http-equiv="refresh" content="0;url=${unauthorizedURL}?${urlToRedirectToAfterLogin}&msg=UNAUTHORIZED" />
            </head>
          </html>`,
        headers: { 'Content-Security-Policy': http.csp.header },
      });
    });
  }

  start({
    audit,
    config,
    clusterClient,
    featureUsageService,
    http,
    legacyAuditLogger,
    loggers,
    session,
  }: AuthenticationServiceStartParams): AuthenticationServiceStart {
    const apiKeys = new APIKeys({
      clusterClient,
      logger: this.logger.get('api-key'),
      license: this.license,
    });

    const getCurrentUser = (request: KibanaRequest) =>
      http.auth.get<AuthenticatedUser>(request).state ?? null;

    this.authenticator = new Authenticator({
      legacyAuditLogger,
      audit,
      loggers,
      clusterClient,
      basePath: http.basePath,
      config: { authc: config.authc },
      getCurrentUser,
      featureUsageService,
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

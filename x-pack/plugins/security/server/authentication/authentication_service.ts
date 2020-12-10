/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  LoggerFactory,
  KibanaRequest,
  Logger,
  HttpServiceSetup,
  IClusterClient,
  ILegacyClusterClient,
  HttpServiceStart,
} from '../../../../../src/core/server';
import type { SecurityLicense } from '../../common/licensing';
import type { AuthenticatedUser } from '../../common/model';
import type { AuditServiceSetup, SecurityAuditLogger } from '../audit';
import type { ConfigType } from '../config';
import type { SecurityFeatureUsageServiceStart } from '../feature_usage';
import type { Session } from '../session_management';
import type { DeauthenticationResult } from './deauthentication_result';
import type { AuthenticationResult } from './authentication_result';
import { getErrorStatusCode } from '../errors';
import { APIKeys } from './api_keys';
import { Authenticator, ProviderLoginAttempt } from './authenticator';

interface AuthenticationServiceSetupParams {
  legacyAuditLogger: SecurityAuditLogger;
  audit: AuditServiceSetup;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  http: HttpServiceSetup;
  clusterClient: ILegacyClusterClient;
  config: ConfigType;
  license: SecurityLicense;
  loggers: LoggerFactory;
  session: PublicMethodsOf<Session>;
}

interface AuthenticationServiceStartParams {
  http: HttpServiceStart;
  clusterClient: IClusterClient;
}

export interface AuthenticationServiceSetup {
  /**
   * @deprecated use `getCurrentUser` from the start contract instead
   */
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
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
  private authenticator!: Authenticator;

  constructor(private readonly logger: Logger) {}

  setup({
    legacyAuditLogger: auditLogger,
    audit,
    getFeatureUsageService,
    http,
    clusterClient,
    config,
    license,
    loggers,
    session,
  }: AuthenticationServiceSetupParams): AuthenticationServiceSetup {
    this.license = license;

    const getCurrentUser = (request: KibanaRequest) => {
      if (!license.isEnabled()) {
        return null;
      }

      return http.auth.get<AuthenticatedUser>(request).state ?? null;
    };

    this.authenticator = new Authenticator({
      legacyAuditLogger: auditLogger,
      audit,
      loggers,
      clusterClient,
      basePath: http.basePath,
      config: { authc: config.authc },
      getCurrentUser,
      getFeatureUsageService,
      license,
      session,
    });

    http.registerAuth(async (request, response, t) => {
      // If security is disabled continue with no user credentials and delete the client cookie as well.
      if (!license.isEnabled()) {
        return t.authenticated();
      }

      let authenticationResult;
      try {
        authenticationResult = await this.authenticator.authenticate(request);
      } catch (err) {
        this.logger.error(err);
        return response.internalError();
      }

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

    this.logger.debug('Successfully registered core authentication handler.');

    return {
      getCurrentUser,
    };
  }

  start({ clusterClient, http }: AuthenticationServiceStartParams): AuthenticationServiceStart {
    const apiKeys = new APIKeys({
      clusterClient,
      logger: this.logger.get('api-key'),
      license: this.license,
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
      getCurrentUser: (request: KibanaRequest) => {
        if (!this.license.isEnabled()) {
          return null;
        }
        return http.auth.get<AuthenticatedUser>(request).state ?? null;
      },
    };
  }
}

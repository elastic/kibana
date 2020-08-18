/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UnwrapPromise } from '@kbn/utility-types';
import {
  ILegacyClusterClient,
  KibanaRequest,
  LoggerFactory,
  HttpServiceSetup,
} from '../../../../../src/core/server';
import { SecurityLicense } from '../../common/licensing';
import { AuthenticatedUser } from '../../common/model';
import { SecurityAuditLogger } from '../audit';
import { ConfigType } from '../config';
import { getErrorStatusCode } from '../errors';
import { SecurityFeatureUsageServiceStart } from '../feature_usage';
import { Session } from '../session_management';
import { Authenticator } from './authenticator';
import { APIKeys, CreateAPIKeyParams, InvalidateAPIKeyParams } from './api_keys';

export { canRedirectRequest } from './can_redirect_request';
export { Authenticator, ProviderLoginAttempt } from './authenticator';
export { AuthenticationResult } from './authentication_result';
export { DeauthenticationResult } from './deauthentication_result';
export {
  OIDCLogin,
  SAMLLogin,
  BasicAuthenticationProvider,
  TokenAuthenticationProvider,
  SAMLAuthenticationProvider,
  OIDCAuthenticationProvider,
} from './providers';
export {
  CreateAPIKeyResult,
  InvalidateAPIKeyResult,
  CreateAPIKeyParams,
  InvalidateAPIKeyParams,
  GrantAPIKeyResult,
} from './api_keys';
export {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from './http_authentication';

interface SetupAuthenticationParams {
  auditLogger: SecurityAuditLogger;
  getFeatureUsageService: () => SecurityFeatureUsageServiceStart;
  http: HttpServiceSetup;
  clusterClient: ILegacyClusterClient;
  config: ConfigType;
  license: SecurityLicense;
  loggers: LoggerFactory;
  session: PublicMethodsOf<Session>;
}

export type Authentication = UnwrapPromise<ReturnType<typeof setupAuthentication>>;

export async function setupAuthentication({
  auditLogger,
  getFeatureUsageService,
  http,
  clusterClient,
  config,
  license,
  loggers,
  session,
}: SetupAuthenticationParams) {
  const authLogger = loggers.get('authentication');

  /**
   * Retrieves currently authenticated user associated with the specified request.
   * @param request
   */
  const getCurrentUser = (request: KibanaRequest) => {
    if (!license.isEnabled()) {
      return null;
    }

    return (http.auth.get(request).state ?? null) as AuthenticatedUser | null;
  };

  const authenticator = new Authenticator({
    auditLogger,
    loggers,
    clusterClient,
    basePath: http.basePath,
    config: { authc: config.authc },
    getCurrentUser,
    getFeatureUsageService,
    license,
    session,
  });

  authLogger.debug('Successfully initialized authenticator.');

  http.registerAuth(async (request, response, t) => {
    // If security is disabled continue with no user credentials and delete the client cookie as well.
    if (!license.isEnabled()) {
      return t.authenticated();
    }

    let authenticationResult;
    try {
      authenticationResult = await authenticator.authenticate(request);
    } catch (err) {
      authLogger.error(err);
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
      authLogger.info(`Authentication attempt failed: ${authenticationResult.error!.message}`);
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

    authLogger.debug('Could not handle authentication attempt');
    return t.notHandled();
  });

  authLogger.debug('Successfully registered core authentication handler.');

  const apiKeys = new APIKeys({
    clusterClient,
    logger: loggers.get('api-key'),
    license,
  });
  return {
    login: authenticator.login.bind(authenticator),
    logout: authenticator.logout.bind(authenticator),
    isProviderTypeEnabled: authenticator.isProviderTypeEnabled.bind(authenticator),
    acknowledgeAccessAgreement: authenticator.acknowledgeAccessAgreement.bind(authenticator),
    getCurrentUser,
    areAPIKeysEnabled: () => apiKeys.areAPIKeysEnabled(),
    createAPIKey: (request: KibanaRequest, params: CreateAPIKeyParams) =>
      apiKeys.create(request, params),
    grantAPIKeyAsInternalUser: (request: KibanaRequest, params: CreateAPIKeyParams) =>
      apiKeys.grantAsInternalUser(request, params),
    invalidateAPIKey: (request: KibanaRequest, params: InvalidateAPIKeyParams) =>
      apiKeys.invalidate(request, params),
    invalidateAPIKeyAsInternalUser: (params: InvalidateAPIKeyParams) =>
      apiKeys.invalidateAsInternalUser(params),
    isAuthenticated: (request: KibanaRequest) => http.auth.isAuthenticated(request),
  };
}

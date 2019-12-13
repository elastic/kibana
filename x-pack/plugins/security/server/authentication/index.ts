/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UnwrapPromise } from '@kbn/utility-types';
import {
  IClusterClient,
  CoreSetup,
  KibanaRequest,
  LoggerFactory,
} from '../../../../../src/core/server';
import { AuthenticatedUser } from '../../common/model';
import { ConfigType } from '../config';
import { getErrorStatusCode } from '../errors';
import { Authenticator, ProviderSession } from './authenticator';
import { LegacyAPI } from '../plugin';
import { APIKeys, CreateAPIKeyParams, InvalidateAPIKeyParams } from './api_keys';
import { SecurityLicense } from '../licensing';

export { canRedirectRequest } from './can_redirect_request';
export { Authenticator, ProviderLoginAttempt } from './authenticator';
export { AuthenticationResult } from './authentication_result';
export { DeauthenticationResult } from './deauthentication_result';
export { OIDCAuthenticationFlow, SAMLLoginStep } from './providers';
export {
  CreateAPIKeyResult,
  InvalidateAPIKeyResult,
  CreateAPIKeyParams,
  InvalidateAPIKeyParams,
} from './api_keys';

interface SetupAuthenticationParams {
  http: CoreSetup['http'];
  clusterClient: IClusterClient;
  config: ConfigType;
  license: SecurityLicense;
  loggers: LoggerFactory;
  getLegacyAPI(): Pick<LegacyAPI, 'isSystemAPIRequest'>;
}

export type Authentication = UnwrapPromise<ReturnType<typeof setupAuthentication>>;

export async function setupAuthentication({
  http,
  clusterClient,
  config,
  license,
  loggers,
  getLegacyAPI,
}: SetupAuthenticationParams) {
  const authLogger = loggers.get('authentication');

  /**
   * Retrieves currently authenticated user associated with the specified request.
   * @param request
   */
  const getCurrentUser = async (request: KibanaRequest) => {
    if (!license.isEnabled()) {
      return null;
    }

    return (await clusterClient
      .asScoped(request)
      .callAsCurrentUser('shield.authenticate')) as AuthenticatedUser;
  };

  const isValid = (sessionValue: ProviderSession) => {
    // ensure that this cookie was created with the current Kibana configuration
    const { path, idleTimeoutExpiration, lifespanExpiration } = sessionValue;
    if (path !== undefined && path !== (http.basePath.serverBasePath || '/')) {
      authLogger.debug(`Outdated session value with path "${sessionValue.path}"`);
      return false;
    }
    // ensure that this cookie is not expired
    if (idleTimeoutExpiration && idleTimeoutExpiration < Date.now()) {
      return false;
    } else if (lifespanExpiration && lifespanExpiration < Date.now()) {
      return false;
    }
    return true;
  };

  const authenticator = new Authenticator({
    clusterClient,
    basePath: http.basePath,
    config: { session: config.session, authc: config.authc },
    isSystemAPIRequest: (request: KibanaRequest) => getLegacyAPI().isSystemAPIRequest(request),
    loggers,
    sessionStorageFactory: await http.createCookieSessionStorageFactory({
      encryptionKey: config.encryptionKey,
      isSecure: config.secureCookies,
      name: config.cookieName,
      validate: (session: ProviderSession | ProviderSession[]) => {
        const array: ProviderSession[] = Array.isArray(session) ? session : [session];
        for (const sess of array) {
          if (!isValid(sess)) {
            return { isValid: false, path: sess.path };
          }
        }
        return { isValid: true };
      },
    }),
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
      return response.redirected({
        headers: {
          location: authenticationResult.redirectURL!,
        },
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
    return response.unauthorized({
      headers: authenticationResult.authResponseHeaders,
    });
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
    getSessionInfo: authenticator.getSessionInfo.bind(authenticator),
    getCurrentUser,
    createAPIKey: (request: KibanaRequest, params: CreateAPIKeyParams) =>
      apiKeys.create(request, params),
    invalidateAPIKey: (request: KibanaRequest, params: InvalidateAPIKeyParams) =>
      apiKeys.invalidate(request, params),
    isAuthenticated: async (request: KibanaRequest) => {
      try {
        await getCurrentUser(request);
      } catch (err) {
        // Don't swallow server errors.
        if (getErrorStatusCode(err) !== 401) {
          throw err;
        }
        return false;
      }

      return true;
    },
  };
}

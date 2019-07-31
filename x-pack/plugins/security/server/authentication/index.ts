/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import {
  ClusterClient,
  CoreSetup,
  KibanaRequest,
  LoggerFactory,
} from '../../../../../src/core/server';
import { AuthenticatedUser } from '../../common/model';
import { ConfigType } from '../config';
import { getErrorStatusCode, wrapError } from '../errors';
import { Authenticator, ProviderSession } from './authenticator';
import { LegacyAPI } from '../plugin';

export { canRedirectRequest } from './can_redirect_request';
export { Authenticator, ProviderLoginAttempt } from './authenticator';
export { AuthenticationResult } from './authentication_result';
export { DeauthenticationResult } from './deauthentication_result';
export { BasicCredentials } from './providers';

interface SetupAuthenticationParams {
  core: CoreSetup;
  clusterClient: PublicMethodsOf<ClusterClient>;
  config: ConfigType;
  loggers: LoggerFactory;
  getLegacyAPI(): LegacyAPI;
}

export async function setupAuthentication({
  core,
  clusterClient,
  config,
  loggers,
  getLegacyAPI,
}: SetupAuthenticationParams) {
  const authLogger = loggers.get('authentication');

  const isSecurityFeatureDisabled = () => {
    const xpackInfo = getLegacyAPI().xpackInfo;
    return xpackInfo.isAvailable() && !xpackInfo.feature('security').isEnabled();
  };

  /**
   * Retrieves currently authenticated user associated with the specified request.
   * @param request
   */
  const getCurrentUser = async (request: KibanaRequest) => {
    if (isSecurityFeatureDisabled()) {
      return null;
    }

    return (await clusterClient
      .asScoped(request)
      .callAsCurrentUser('shield.authenticate')) as AuthenticatedUser;
  };

  const authenticator = new Authenticator({
    clusterClient,
    basePath: core.http.basePath,
    config: { sessionTimeout: config.sessionTimeout, authc: config.authc },
    isSystemAPIRequest: (request: KibanaRequest) => getLegacyAPI().isSystemAPIRequest(request),
    loggers,
    sessionStorageFactory: await core.http.createCookieSessionStorageFactory({
      encryptionKey: config.encryptionKey,
      isSecure: config.secureCookies,
      name: config.cookieName,
      validate: (sessionValue: ProviderSession) =>
        !(sessionValue.expires && sessionValue.expires < Date.now()),
    }),
  });

  authLogger.debug('Successfully initialized authenticator.');

  core.http.registerAuth(async (request, t) => {
    // If security is disabled continue with no user credentials and delete the client cookie as well.
    if (isSecurityFeatureDisabled()) {
      return t.authenticated();
    }

    let authenticationResult;
    try {
      authenticationResult = await authenticator.authenticate(request);
    } catch (err) {
      authLogger.error(err);
      return t.rejected(wrapError(err));
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
      return t.redirected(authenticationResult.redirectURL!);
    }

    let error;
    if (authenticationResult.failed()) {
      authLogger.info(`Authentication attempt failed: ${authenticationResult.error!.message}`);
      error = wrapError(authenticationResult.error);

      const authResponseHeaders = authenticationResult.authResponseHeaders;
      for (const [headerName, headerValue] of Object.entries(authResponseHeaders || {})) {
        if (error.output.headers[headerName] !== undefined) {
          authLogger.warn(`Server rewrites a error response header [${headerName}].`);
        }
        // Hapi typings don't support headers that are `string[]`.
        error.output.headers[headerName] = headerValue as any;
      }
    } else {
      authLogger.info('Could not handle authentication attempt');
      error = Boom.unauthorized();
    }

    return t.rejected(error);
  });

  authLogger.debug('Successfully registered core authentication handler.');

  return {
    login: authenticator.login.bind(authenticator),
    logout: authenticator.logout.bind(authenticator),
    getCurrentUser,
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

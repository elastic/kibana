/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { parseNext } from '../../../common/parse_next';
import { canRedirectRequest, OIDCLogin, SAMLLogin } from '../../authentication';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import {
  OIDCAuthenticationProvider,
  SAMLAuthenticationProvider,
} from '../../authentication/providers';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes that are common to various authentication mechanisms.
 */
export function defineCommonRoutes({
  router,
  authc,
  basePath,
  license,
  logger,
}: RouteDefinitionParams) {
  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  for (const path of ['/api/security/logout', '/api/security/v1/logout']) {
    router.get(
      {
        path,
        // Allow unknown query parameters as this endpoint can be hit by the 3rd-party with any
        // set of query string parameters (e.g. SAML/OIDC logout request/response parameters).
        validate: { query: schema.object({}, { unknowns: 'allow' }) },
        options: { authRequired: false },
      },
      async (context, request, response) => {
        const serverBasePath = basePath.serverBasePath;
        if (path === '/api/security/v1/logout') {
          logger.warn(
            `The "${serverBasePath}${path}" URL is deprecated and will stop working in the next major version, please use "${serverBasePath}/api/security/logout" URL instead.`,
            { tags: ['deprecation'] }
          );
        }

        if (!canRedirectRequest(request)) {
          return response.badRequest({
            body: 'Client should be able to process redirect response.',
          });
        }

        try {
          const deauthenticationResult = await authc.logout(request);
          if (deauthenticationResult.failed()) {
            return response.customError(wrapIntoCustomErrorResponse(deauthenticationResult.error));
          }

          return response.redirected({
            headers: { location: deauthenticationResult.redirectURL || `${serverBasePath}/` },
          });
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      }
    );
  }

  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  for (const path of ['/internal/security/me', '/api/security/v1/me']) {
    router.get(
      { path, validate: false },
      createLicensedRouteHandler((context, request, response) => {
        if (path === '/api/security/v1/me') {
          logger.warn(
            `The "${basePath.serverBasePath}${path}" endpoint is deprecated and will be removed in the next major version.`,
            { tags: ['deprecation'] }
          );
        }

        return response.ok({ body: authc.getCurrentUser(request)! });
      })
    );
  }

  function getLoginAttemptForProviderType(providerType: string, redirectURL: string) {
    const [redirectURLPath] = redirectURL.split('#');
    const redirectURLFragment =
      redirectURL.length > redirectURLPath.length
        ? redirectURL.substring(redirectURLPath.length)
        : '';

    if (providerType === SAMLAuthenticationProvider.type) {
      return { type: SAMLLogin.LoginInitiatedByUser, redirectURLPath, redirectURLFragment };
    }

    if (providerType === OIDCAuthenticationProvider.type) {
      return { type: OIDCLogin.LoginInitiatedByUser, redirectURLPath };
    }

    return undefined;
  }

  router.post(
    {
      path: '/internal/security/login_with',
      validate: {
        body: schema.object({
          providerType: schema.string(),
          providerName: schema.string(),
          currentURL: schema.string(),
        }),
      },
      options: { authRequired: false },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { providerType, providerName, currentURL } = request.body;
      logger.info(`Logging in with provider "${providerName}" (${providerType})`);

      const redirectURL = parseNext(currentURL, basePath.serverBasePath);
      try {
        const authenticationResult = await authc.login(request, {
          provider: { name: providerName },
          value: getLoginAttemptForProviderType(providerType, redirectURL),
        });

        if (authenticationResult.redirected() || authenticationResult.succeeded()) {
          return response.ok({
            body: { location: authenticationResult.redirectURL || redirectURL },
            headers: authenticationResult.authResponseHeaders,
          });
        }

        return response.unauthorized({
          body: authenticationResult.error,
          headers: authenticationResult.authResponseHeaders,
        });
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }
    })
  );

  router.post(
    { path: '/internal/security/access_agreement/acknowledge', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      // If license doesn't allow access agreement we shouldn't handle request.
      if (!license.getFeatures().allowAccessAgreement) {
        logger.warn(`Attempted to acknowledge access agreement when license doesn't allow it.`);
        return response.forbidden({
          body: { message: `Current license doesn't support access agreement.` },
        });
      }

      try {
        await authc.acknowledgeAccessAgreement(request);
      } catch (err) {
        logger.error(err);
        return response.internalError();
      }

      return response.noContent();
    })
  );
}

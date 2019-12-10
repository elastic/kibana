/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { canRedirectRequest } from '../../authentication';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes that are common to various authentication mechanisms.
 */
export function defineCommonRoutes({ router, authc, basePath, logger }: RouteDefinitionParams) {
  // Generate two identical routes with new and deprecated URL and issue a warning if route with deprecated URL is ever used.
  for (const path of ['/api/security/logout', '/api/security/v1/logout']) {
    router.get(
      {
        path,
        // Allow unknown query parameters as this endpoint can be hit by the 3rd-party with any
        // set of query string parameters (e.g. SAML/OIDC logout request parameters).
        validate: { query: schema.object({}, { allowUnknowns: true }) },
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
      createLicensedRouteHandler(async (context, request, response) => {
        if (path === '/api/security/v1/me') {
          logger.warn(
            `The "${basePath.serverBasePath}${path}" endpoint is deprecated and will be removed in the next major version.`,
            { tags: ['deprecation'] }
          );
        }

        try {
          return response.ok({ body: (await authc.getCurrentUser(request)) as any });
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      })
    );
  }
}

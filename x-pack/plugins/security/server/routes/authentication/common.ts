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
export function defineCommonRoutes({ router, authc, basePath }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/security/logout',
      // Allow unknown query parameters as this endpoint can be hit by the 3rd-party with any
      // set of query string parameters (e.g. SAML/OIDC logout request parameters).
      validate: { query: schema.object({}, { allowUnknowns: true }) },
      options: { authRequired: false },
    },
    async (context, request, response) => {
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
          headers: {
            location: deauthenticationResult.redirectURL || `${basePath.serverBasePath}/`,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    }
  );

  router.get(
    { path: '/internal/security/me', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        return response.ok({ body: (await authc.getCurrentUser(request)) as any });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for Basic/Token authentication.
 */
export function defineBasicRoutes({ router, authc, config }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/login',
      validate: {
        body: schema.object({
          username: schema.string({ minLength: 1 }),
          password: schema.string({ minLength: 1 }),
        }),
      },
      options: { authRequired: false },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      // We should prefer `token` over `basic` if possible.
      const loginAttempt = authc.isProviderEnabled('token')
        ? { provider: 'token', value: request.body }
        : { provider: 'basic', value: request.body };

      try {
        const authenticationResult = await authc.login(request, loginAttempt);
        if (!authenticationResult.succeeded()) {
          return response.unauthorized({ body: authenticationResult.error });
        }

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

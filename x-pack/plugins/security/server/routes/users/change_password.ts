/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

export function defineChangeUserPasswordRoutes({
  authc,
  router,
  clusterClient,
  config,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/users/{username}/password',
      validate: {
        params: schema.object({ username: schema.string({ minLength: 1, maxLength: 1024 }) }),
        body: schema.object({
          password: schema.maybe(schema.string({ minLength: 1 })),
          newPassword: schema.string({ minLength: 1 }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const username = request.params.username;
      const { password, newPassword } = request.body;
      const isCurrentUser = username === (await authc.getCurrentUser(request))!.username;

      // We should prefer `token` over `basic` if possible.
      const providerToLoginWith = config.authc.providers.includes('token') ? 'token' : 'basic';

      // If user tries to change own password, let's check if old password is valid first by trying
      // to login.
      if (isCurrentUser) {
        try {
          const authenticationResult = await authc.login(request, {
            provider: providerToLoginWith,
            value: { username, password },
            // We shouldn't alter authentication state just yet.
            stateless: true,
          });

          if (!authenticationResult.succeeded()) {
            return response.forbidden({ body: authenticationResult.error });
          }
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      }

      try {
        await clusterClient.asScoped(request).callAsCurrentUser('shield.changePassword', {
          username,
          body: { password: newPassword },
        });

        // Now we authenticate user with the new password again updating current session if any.
        if (isCurrentUser) {
          const authenticationResult = await authc.login(request, {
            provider: providerToLoginWith,
            value: { username, password: newPassword },
          });

          if (!authenticationResult.succeeded()) {
            return response.unauthorized({ body: authenticationResult.error });
          }
        }

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

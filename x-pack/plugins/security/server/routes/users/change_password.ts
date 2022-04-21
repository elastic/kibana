/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { canUserChangePassword } from '../../../common/model';
import {
  BasicHTTPAuthorizationHeaderCredentials,
  HTTPAuthorizationHeader,
} from '../../authentication';
import { getErrorStatusCode, wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineChangeUserPasswordRoutes({
  getAuthenticationService,
  getSession,
  router,
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
      const { username } = request.params;
      const { password: currentPassword, newPassword } = request.body;

      const currentUser = getAuthenticationService().getCurrentUser(request);
      const isUserChangingOwnPassword =
        currentUser && currentUser.username === username && canUserChangePassword(currentUser);
      const currentSession = isUserChangingOwnPassword ? await getSession().get(request) : null;

      // If user is changing their own password they should provide a proof of knowledge their
      // current password via sending it in `Authorization: Basic base64(username:current password)`
      // HTTP header no matter how they logged in to Kibana.
      const options = isUserChangingOwnPassword
        ? {
            headers: {
              authorization: new HTTPAuthorizationHeader(
                'Basic',
                new BasicHTTPAuthorizationHeaderCredentials(
                  username,
                  currentPassword || ''
                ).toString()
              ).toString(),
            },
          }
        : undefined;

      try {
        await context.core.elasticsearch.client.asCurrentUser.security.changePassword(
          { username, body: { password: newPassword } },
          options
        );
      } catch (error) {
        // This may happen only if user's credentials are rejected meaning that current password
        // isn't correct.
        if (isUserChangingOwnPassword && getErrorStatusCode(error) === 401) {
          return response.forbidden({ body: error });
        }

        return response.customError(wrapIntoCustomErrorResponse(error));
      }

      // If user previously had an active session and changed their own password we should re-login
      // user with the new password and update session. We check this since it's possible to update
      // password even if user is authenticated via HTTP headers and hence doesn't have an active
      // session and in such cases we shouldn't create a new one.
      if (isUserChangingOwnPassword && currentSession) {
        try {
          const authenticationResult = await getAuthenticationService().login(request, {
            provider: { name: currentSession.provider.name },
            value: { username, password: newPassword },
          });

          if (!authenticationResult.succeeded()) {
            return response.unauthorized({ body: authenticationResult.error });
          }
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      }

      return response.noContent();
    })
  );
}

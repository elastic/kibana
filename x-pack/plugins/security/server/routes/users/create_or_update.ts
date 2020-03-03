/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

export function defineCreateOrUpdateUserRoutes({ router, clusterClient }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/users/{username}',
      validate: {
        params: schema.object({ username: schema.string({ minLength: 1, maxLength: 1024 }) }),
        body: schema.object({
          username: schema.string({ minLength: 1, maxLength: 1024 }),
          password: schema.maybe(schema.string({ minLength: 1 })),
          roles: schema.arrayOf(schema.string({ minLength: 1 })),
          full_name: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
          email: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
          metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          enabled: schema.boolean({ defaultValue: true }),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        await clusterClient.asScoped(request).callAsCurrentUser('shield.putUser', {
          username: request.params.username,
          // Omit `username`, `enabled` and all fields with `null` value.
          body: Object.fromEntries(
            Object.entries(request.body).filter(
              ([key, value]) => value !== null && key !== 'enabled' && key !== 'username'
            )
          ),
        });

        return response.ok({ body: request.body });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

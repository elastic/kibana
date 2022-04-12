/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineCreateOrUpdateUserRoutes({ router }: RouteDefinitionParams) {
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
        const esClient = (await context.core).elasticsearch.client;
        await esClient.asCurrentUser.security.putUser({
          username: request.params.username,
          body: request.body,
        });

        return response.ok({ body: request.body });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

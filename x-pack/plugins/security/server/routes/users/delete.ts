/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { wrapIntoCustomErrorResponse } from '../../errors';
import type { RouteDefinitionParams } from '../index';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineDeleteUserRoutes({ router }: RouteDefinitionParams) {
  router.delete(
    {
      path: '/internal/security/users/{username}',
      validate: {
        params: schema.object({ username: schema.string({ minLength: 1, maxLength: 1024 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        await esClient.asCurrentUser.security.deleteUser({
          username: request.params.username,
        });

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

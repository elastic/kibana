/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../index';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineEnableUserRoutes({ router }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/users/{username}/_enable',
      validate: {
        params: schema.object({ username: schema.string({ minLength: 1, maxLength: 1024 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        await context.core.elasticsearch.client.asCurrentUser.security.enableUser({
          username: request.params.username,
        });

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

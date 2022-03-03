/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { wrapIntoCustomErrorResponse } from '../../errors';
import type { RouteDefinitionParams } from '../index';
import { createLicensedRouteHandler } from '../licensed_route_handler';

export function defineGetAllUsersRoutes({ router }: RouteDefinitionParams) {
  router.get(
    { path: '/internal/security/users', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        return response.ok({
          // Return only values since keys (user names) are already duplicated there.
          body: Object.values(
            await context.core.elasticsearch.client.asCurrentUser.security.getUser()
          ),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

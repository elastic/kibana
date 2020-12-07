/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../../index';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapIntoCustomErrorResponse } from '../../../errors';

export function defineDeleteRolesRoutes({ router }: RouteDefinitionParams) {
  router.delete(
    {
      path: '/api/security/role/{name}',
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        await context.core.elasticsearch.client.asCurrentUser.security.deleteRole({
          name: request.params.name,
        });

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

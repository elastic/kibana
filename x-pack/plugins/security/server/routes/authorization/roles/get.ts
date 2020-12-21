/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../..';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { ElasticsearchRole, transformElasticsearchRoleToRole } from './model';

export function defineGetRolesRoutes({ router, authz }: RouteDefinitionParams) {
  router.get(
    {
      path: '/api/security/role/{name}',
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const {
          body: elasticsearchRoles,
        } = await context.core.elasticsearch.client.asCurrentUser.security.getRole<
          Record<string, ElasticsearchRole>
        >({ name: request.params.name });

        const elasticsearchRole = elasticsearchRoles[request.params.name];
        if (elasticsearchRole) {
          return response.ok({
            body: transformElasticsearchRoleToRole(
              elasticsearchRole,
              request.params.name,
              authz.applicationName
            ),
          });
        }

        return response.notFound();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

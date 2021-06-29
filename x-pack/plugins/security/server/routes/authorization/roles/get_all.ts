/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import type { ElasticsearchRole } from './model';
import { transformElasticsearchRoleToRole } from './model';

export function defineGetAllRolesRoutes({ router, authz }: RouteDefinitionParams) {
  router.get(
    { path: '/api/security/role', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const {
          body: elasticsearchRoles,
        } = await context.core.elasticsearch.client.asCurrentUser.security.getRole<
          Record<string, ElasticsearchRole>
        >();

        // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
        return response.ok({
          body: Object.entries(elasticsearchRoles)
            .map(([roleName, elasticsearchRole]) =>
              transformElasticsearchRoleToRole(
                // @ts-expect-error @elastic/elasticsearch SecurityIndicesPrivileges.names expected to be string[]
                elasticsearchRole,
                roleName,
                authz.applicationName
              )
            )
            .sort((roleA, roleB) => {
              if (roleA.name < roleB.name) {
                return -1;
              }

              if (roleA.name > roleB.name) {
                return 1;
              }

              return 0;
            }),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

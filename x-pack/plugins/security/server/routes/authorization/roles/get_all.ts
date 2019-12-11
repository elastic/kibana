/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '../..';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapError } from '../../../errors';
import { ElasticsearchRole, transformElasticsearchRoleToRole } from './model';

export function defineGetAllRolesRoutes({ router, authz, clusterClient }: RouteDefinitionParams) {
  router.get(
    { path: '/api/security/role', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const elasticsearchRoles = (await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole')) as Record<string, ElasticsearchRole>;

        // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
        return response.ok({
          body: Object.entries(elasticsearchRoles)
            .map(([roleName, elasticsearchRole]) =>
              transformElasticsearchRoleToRole(elasticsearchRole, roleName, authz.applicationName)
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
        const wrappedError = wrapError(error);
        return response.customError({
          body: wrappedError,
          statusCode: wrappedError.output.statusCode,
        });
      }
    })
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../..';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapError } from '../../../errors';
import { ElasticsearchRole, transformElasticsearchRoleToRole } from './model';

export function defineGetRolesRoutes({ router, authz, clusterClient }: RouteDefinitionParams) {
  router.get(
    { path: '/api/security/role', validate: false },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const elasticsearchRoles = (await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole')) as Record<string, ElasticsearchRole>;

        // Transform elasticsearch roles into Kibana roles and return in a list sorted by role name.
        return response.ok({
          body: Object.entries(elasticsearchRoles)
            .map(([roleName, elasticsearchRole]) =>
              transformElasticsearchRoleToRole(
                elasticsearchRole,
                roleName,
                authz.getApplicationName()
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
        const wrappedError = wrapError(error);
        return response.customError({
          body: wrappedError,
          statusCode: wrappedError.output.statusCode,
        });
      }
    })
  );

  router.get(
    {
      path: '/api/security/role/{name}',
      validate: { params: schema.object({ name: schema.string({ minLength: 1 }) }) },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const elasticsearchRoles = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole', { name: request.params.name });

        const elasticsearchRole = elasticsearchRoles[request.params.name];
        if (elasticsearchRole) {
          return response.ok({
            body: transformElasticsearchRoleToRole(
              elasticsearchRole,
              request.params.name,
              authz.getApplicationName()
            ),
          });
        }

        return response.notFound();
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { compareRoles, transformElasticsearchRoleToRole } from '../../../authorization';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineGetAllRolesBySpaceRoutes({
  router,
  authz,
  getFeatures,
  logger,
  buildFlavor,
  config,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/roles/{spaceId}',
      options: {
        tags: ['access:spacesManagement'],
      },
      validate: {
        params: schema.object({ spaceId: schema.string({ minLength: 1 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const hideReservedRoles = buildFlavor === 'serverless';
        const esClient = (await context.core).elasticsearch.client;
        const spaceId = request.params.spaceId;

        const { cluster: clusterPrivileges } = await esClient.asCurrentUser.security.hasPrivileges({
          body: {
            cluster: ['manage_security', 'read_security'],
          },
        });

        if (!clusterPrivileges.manage_security && !clusterPrivileges.read_security) {
          return response.forbidden({
            body: { message: `User not authorized to view roles in space ${spaceId}` },
          });
        }

        const [features, elasticsearchRoles] = await Promise.all([
          getFeatures(),
          await esClient.asCurrentUser.security.getRole(),
        ]);

        // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
        return response.ok({
          body: Object.entries(elasticsearchRoles)
            .map(([roleName, elasticsearchRole]) =>
              transformElasticsearchRoleToRole(
                features,
                // @ts-expect-error @elastic/elasticsearch SecurityIndicesPrivileges.names expected to be string[]
                elasticsearchRole,
                roleName,
                authz.applicationName,
                logger
              )
            )
            .filter(
              (role) =>
                !(hideReservedRoles && role.metadata?._reserved) &&
                role.kibana.some(
                  (privilege) =>
                    privilege.spaces.includes(request.params.spaceId) ||
                    privilege.spaces.includes('*')
                )
            )
            .sort(compareRoles),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

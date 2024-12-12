/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SecurityQueryRoleQueryRole } from '@elastic/elasticsearch/lib/api/types';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import type { Role } from '../../../../common';
import { ALL_SPACES_ID } from '../../../../common/constants';
import { compareRolesByName, transformElasticsearchRoleToRole } from '../../../authorization';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineGetAllRolesBySpaceRoutes({
  router,
  authz,
  getFeatures,
  logger,
  buildFlavor,
  subFeaturePrivilegeIterator,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/roles/{spaceId}',
      security: {
        authz: {
          requiredPrivileges: ['manage_spaces'],
        },
      },
      validate: {
        params: schema.object({ spaceId: schema.string({ minLength: 1 }) }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const hideReservedRoles = buildFlavor === 'serverless';
        const esClient = (await context.core).elasticsearch.client;

        const [features, queryRolesResponse] = await Promise.all([
          getFeatures(),
          // await esClient.asCurrentUser.security.getRole(),
          await esClient.asCurrentUser.security.queryRole({
            query: {
              bool: {
                must: [
                  {
                    term: {
                      'applications.resources': `space:${request.params.spaceId}`,
                    },
                  },
                ],
              },
            },
          }),
        ]);
        const elasticsearchRoles = queryRolesResponse.roles?.reduce<
          Record<string, SecurityQueryRoleQueryRole>
        >((acc, role) => {
          return {
            ...acc,
            [role.name]: role,
          };
        }, {});
        // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
        return response.ok({
          body: Object.entries(elasticsearchRoles)
            .reduce<Role[]>((acc, [roleName, elasticsearchRole]) => {
              if (hideReservedRoles && elasticsearchRole.metadata?._reserved) {
                return acc;
              }

              const role = transformElasticsearchRoleToRole({
                features,
                elasticsearchRole, // TODO: address why the `remote_cluster` field is throwing type errors
                name: roleName,
                application: authz.applicationName,
                logger,
                subFeaturePrivilegeIterator,
                // For the internal APIs we always transform deprecated privileges.
                replaceDeprecatedKibanaPrivileges: true,
              });

              const includeRoleForSpace = role.kibana.some((privilege) => {
                const privilegeInSpace =
                  privilege.spaces.includes(request.params.spaceId) ||
                  privilege.spaces.includes(ALL_SPACES_ID);

                if (privilegeInSpace && privilege.base.length) {
                  return true;
                }

                const hasFeaturePrivilege = Object.values(privilege.feature).some(
                  (featureList) => featureList.length
                );

                return privilegeInSpace && hasFeaturePrivilege;
              });

              if (includeRoleForSpace) {
                acc.push(role);
              }

              return acc;
            }, [])
            .sort(compareRolesByName),
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

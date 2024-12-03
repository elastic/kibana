/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '../..';
import { API_VERSIONS } from '../../../../common/constants';
import { compareRolesByName, transformElasticsearchRoleToRole } from '../../../authorization';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineGetAllRolesRoutes({
  router,
  authz,
  getFeatures,
  subFeaturePrivilegeIterator,
  logger,
  buildFlavor,
}: RouteDefinitionParams) {
  router.versioned
    .get({
      path: '/api/security/role',
      access: 'public',
      summary: `Get all roles`,
      options: {
        tags: ['oas-tag:roles'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.roles.public.v1,
        security: {
          authz: {
            enabled: false,
            reason: `This route delegates authorization to Core's scoped ES cluster client`,
          },
        },
        validate: {
          request: {
            query: schema.maybe(
              schema.object({
                replaceDeprecatedPrivileges: schema.maybe(
                  schema.boolean({
                    meta: {
                      description:
                        'If `true` and the response contains any privileges that are associated with deprecated features, they are omitted in favor of details about the appropriate replacement feature privileges.',
                    },
                  })
                ),
              })
            ),
          },
          response: {
            200: {
              description: 'Indicates a successful call.',
            },
          },
        },
      },
      createLicensedRouteHandler(async (context, request, response) => {
        try {
          const hideReservedRoles = buildFlavor === 'serverless';
          const esClient = (await context.core).elasticsearch.client;
          const [features, elasticsearchRoles] = await Promise.all([
            getFeatures(),
            await esClient.asCurrentUser.security.getRole(),
          ]);

          // Transform elasticsearch roles into Kibana roles and return in a list sorted by the role name.
          return response.ok({
            body: Object.entries(elasticsearchRoles)
              .map(([roleName, elasticsearchRole]) =>
                transformElasticsearchRoleToRole({
                  features,
                  subFeaturePrivilegeIterator, // @ts-expect-error @elastic/elasticsearch SecurityIndicesPrivileges.names expected to be string[]
                  elasticsearchRole,
                  name: roleName,
                  application: authz.applicationName,
                  logger,
                  replaceDeprecatedKibanaPrivileges:
                    request.query?.replaceDeprecatedPrivileges ?? false,
                })
              )
              .filter((role) => {
                return !hideReservedRoles || !role.metadata?._reserved;
              })
              .sort(compareRolesByName),
          });
        } catch (error) {
          return response.customError(wrapIntoCustomErrorResponse(error));
        }
      })
    );
}

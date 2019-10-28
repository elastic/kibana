/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { schema, TypeOf } from '@kbn/config-schema';
import { RouteDefinitionParams } from '../../index';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { GLOBAL_RESOURCE } from '../../../../common/constants';
import { wrapError } from '../../../errors';
import { PrivilegeSerializer } from '../../../authorization/privilege_serializer';
import { ResourceSerializer } from '../../../authorization/resource_serializer';
import { ElasticsearchRole } from '.';

export function definePutRolesRoutes({ router, authz, clusterClient }: RouteDefinitionParams) {
  const transformPrivilegesToElasticsearchPrivileges = (
    privileges: TypeOf<typeof payloadSchema>['kibana'] = []
  ) => {
    return privileges.map(({ base, feature, spaces }) => {
      if (spaces.length === 1 && spaces[0] === GLOBAL_RESOURCE) {
        return {
          privileges: [
            ...(base
              ? base.map(privilege => PrivilegeSerializer.serializeGlobalBasePrivilege(privilege))
              : []),
            ...(feature
              ? Object.entries(feature)
                  .map(([featureName, featurePrivileges]) =>
                    featurePrivileges.map(privilege =>
                      PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                    )
                  )
                  .flat()
              : []),
          ],
          application: authz.getApplicationName(),
          resources: [GLOBAL_RESOURCE],
        };
      }

      return {
        privileges: [
          ...(base
            ? base.map(privilege => PrivilegeSerializer.serializeSpaceBasePrivilege(privilege))
            : []),
          ...(feature
            ? Object.entries(feature)
                .map(([featureName, featurePrivileges]) =>
                  featurePrivileges.map(privilege =>
                    PrivilegeSerializer.serializeFeaturePrivilege(featureName, privilege)
                  )
                )
                .flat()
            : []),
        ],
        application: authz.getApplicationName(),
        resources: (spaces as string[]).map(resource =>
          ResourceSerializer.serializeSpaceResource(resource)
        ),
      };
    });
  };

  const transformRolesToElasticsearchRoles = (
    rolePayload: TypeOf<typeof payloadSchema>,
    existingApplications: ElasticsearchRole['applications'] = []
  ) => {
    const {
      elasticsearch = { cluster: undefined, indices: undefined, run_as: undefined },
      kibana = [],
    } = rolePayload;
    const otherApplications = existingApplications.filter(
      roleApplication => roleApplication.application !== authz.getApplicationName()
    );

    return {
      metadata: rolePayload.metadata,
      cluster: elasticsearch.cluster || [],
      indices: elasticsearch.indices || [],
      run_as: elasticsearch.run_as || [],
      applications: [...transformPrivilegesToElasticsearchPrivileges(kibana), ...otherApplications],
    } as Omit<ElasticsearchRole, 'name'>;
  };

  const FEATURE_NAME_VALUE_REGEX = /^[a-zA-Z0-9_-]+$/;
  const allSpacesSchema = schema.arrayOf(schema.literal(GLOBAL_RESOURCE), {
    minSize: 1,
    maxSize: 1,
  });
  const spacesSchema = schema.oneOf(
    [
      allSpacesSchema,
      schema.arrayOf(
        schema.string({
          validate(value) {
            if (!/^[a-z0-9_-]+$/.test(value)) {
              return `must be lower case, a-z, 0-9, '_', and '-' are allowed`;
            }
          },
        })
      ),
    ],
    { defaultValue: [GLOBAL_RESOURCE] }
  );

  const payloadSchema = schema.object({
    metadata: schema.maybe(schema.recordOf(schema.string(), schema.any())),
    elasticsearch: schema.object({
      cluster: schema.maybe(schema.arrayOf(schema.string())),
      indices: schema.maybe(
        schema.arrayOf(
          schema.object({
            names: schema.arrayOf(schema.string(), { defaultValue: [] }),
            field_security: schema.maybe(
              schema.recordOf(
                schema.oneOf([schema.literal('grant'), schema.literal('except')]),
                schema.arrayOf(schema.string())
              )
            ),
            privileges: schema.arrayOf(schema.string(), { defaultValue: [] }),
            query: schema.maybe(schema.string()),
            allow_restricted_indices: schema.maybe(schema.boolean()),
          })
        )
      ),
      run_as: schema.maybe(schema.arrayOf(schema.string())),
    }),
    kibana: schema.maybe(
      schema.arrayOf(
        schema.object(
          {
            spaces: spacesSchema,
            base: schema.maybe(
              schema.conditional(
                schema.siblingRef('spaces'),
                allSpacesSchema,
                schema.arrayOf(
                  schema.string({
                    validate(value) {
                      const privilegeNames = Object.keys(authz.privileges.get().global);
                      if (!privilegeNames.some(globalPrivilege => globalPrivilege === value)) {
                        return `unknown global privilege "${value}", must be one of [${privilegeNames}]`;
                      }
                    },
                  })
                ),
                schema.arrayOf(
                  schema.string({
                    validate(value) {
                      const privilegeNames = Object.keys(authz.privileges.get().space);
                      if (!privilegeNames.some(globalPrivilege => globalPrivilege === value)) {
                        return `unknown space privilege "${value}", must be one of [${privilegeNames}]`;
                      }
                    },
                  })
                )
              )
            ),
            feature: schema.maybe(
              schema.recordOf(
                schema.string({
                  validate(value) {
                    if (!FEATURE_NAME_VALUE_REGEX.test(value)) {
                      return `only a-z, A-Z, 0-9, '_', and '-' are allowed`;
                    }
                  },
                }),
                schema.arrayOf(
                  schema.string({
                    validate(value) {
                      if (!FEATURE_NAME_VALUE_REGEX.test(value)) {
                        return `only a-z, A-Z, 0-9, '_', and '-' are allowed`;
                      }
                    },
                  })
                )
              )
            ),
          },
          {
            validate(value) {
              if (value.base === undefined && value.feature === undefined) {
                return 'either [base] or [feature] is expected, but none of them specified';
              }

              if (
                value.base !== undefined &&
                value.base.length > 0 &&
                value.feature !== undefined &&
                Object.keys(value.feature).length > 0
              ) {
                return `definition of [feature] isn't allowed when non-empty [base] is defined.`;
              }
            },
          }
        ),
        {
          validate(value) {
            for (const [indexA, valueA] of value.entries()) {
              for (const valueB of value.slice(indexA + 1)) {
                if (_.intersection(valueA.spaces, valueB.spaces).length !== 0) {
                  return 'values are not unique';
                }
              }
            }
          },
        }
      )
    ),
  });

  router.put(
    {
      path: '/api/security/role/{name}',
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }),
        body: payloadSchema,
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { name } = request.params;

      try {
        const rawRoles: Record<string, ElasticsearchRole> = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole', {
            name: request.params.name,
            ignore: [404],
          });

        const body = transformRolesToElasticsearchRoles(
          request.body,
          rawRoles[name] ? rawRoles[name].applications : []
        );

        await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.putRole', { name: request.params.name, body });

        return response.noContent();
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

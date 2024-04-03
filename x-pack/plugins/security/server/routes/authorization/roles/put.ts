/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { KibanaFeature } from '@kbn/features-plugin/common';

import type { RolePayloadSchemaType } from './model';
import { getPutPayloadSchema, transformPutPayloadToElasticsearchRole } from './model';
import type { RouteDefinitionParams } from '../..';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { validateKibanaPrivileges } from '../../../lib';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

const roleGrantsSubFeaturePrivileges = (features: KibanaFeature[], role: RolePayloadSchemaType) => {
  if (!role.kibana) {
    return false;
  }

  const subFeaturePrivileges = new Map(
    features.map((feature) => [
      feature.id,
      feature.subFeatures.map((sf) => sf.privilegeGroups.map((pg) => pg.privileges)).flat(2),
    ])
  );

  const hasAnySubFeaturePrivileges = role.kibana.some((kibanaPrivilege) =>
    Object.entries(kibanaPrivilege.feature ?? {}).some(([featureId, privileges]) => {
      return !!subFeaturePrivileges.get(featureId)?.some(({ id }) => privileges.includes(id));
    })
  );

  return hasAnySubFeaturePrivileges;
};

export function definePutRolesRoutes({
  router,
  authz,
  getFeatures,
  getFeatureUsageService,
}: RouteDefinitionParams) {
  router.put(
    {
      path: '/api/security/role/{name}',
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }),
        query: schema.object({ createOnly: schema.boolean({ defaultValue: false }) }),
        body: getPutPayloadSchema(() => {
          const privileges = authz.privileges.get();
          return {
            global: Object.keys(privileges.global),
            space: Object.keys(privileges.space),
          };
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { name } = request.params;
      const { createOnly } = request.query;
      try {
        const esClient = (await context.core).elasticsearch.client;
        const [features, rawRoles] = await Promise.all([
          getFeatures(),
          esClient.asCurrentUser.security.getRole({ name: request.params.name }, { ignore: [404] }),
        ]);

        const { validationErrors } = validateKibanaPrivileges(features, request.body.kibana);
        if (validationErrors.length) {
          return response.badRequest({
            body: {
              message: `Role cannot be updated due to validation errors: ${JSON.stringify(
                validationErrors
              )}`,
            },
          });
        }

        if (createOnly && !!rawRoles[name]) {
          return response.conflict({
            body: {
              message: `Role already exists and cannot be created: ${name}`,
            },
          });
        }

        const body = transformPutPayloadToElasticsearchRole(
          request.body,
          authz.applicationName,
          rawRoles[name] ? rawRoles[name].applications : []
        );

        await esClient.asCurrentUser.security.putRole({
          name: request.params.name,
          body,
        });

        if (roleGrantsSubFeaturePrivileges(features, request.body)) {
          getFeatureUsageService().recordSubFeaturePrivilegeUsage();
        }

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

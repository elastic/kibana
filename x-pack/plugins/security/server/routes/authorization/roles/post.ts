/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/common';

import type { RolePayloadSchemaType } from './model';
import { getPostPayloadSchema, transformPutPayloadToElasticsearchRole } from './model';
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

interface ESRolesResponse {
  noop?: string[];
  created?: string[];
  updated?: string[];
  errors?: {
    count: number;
    details: Record<
      string,
      {
        type: string;
        reason: string;
      }
    >;
  };
}

export function definePostRolesRoutes({
  router,
  authz,
  getFeatures,
  getFeatureUsageService,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/api/security/roles',
      options: {
        summary: `Create or update roles`,
      },
      validate: {
        body: getPostPayloadSchema(() => {
          const privileges = authz.privileges.get();
          return {
            global: Object.keys(privileges.global),
            space: Object.keys(privileges.space),
          };
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const esClient = (await context.core).elasticsearch.client;
        const names = Object.keys(request.body.roles);

        const [features, rawRoles] = await Promise.all([
          getFeatures(),
          esClient.asCurrentUser.security.getRole({ name: names.join(',') }, { ignore: [404] }),
        ]);

        const errors: Record<string, any> = {};
        const esRoles: Record<string, any> = {};

        for (const [name, role] of Object.entries(request.body.roles)) {
          const { validationErrors } = validateKibanaPrivileges(features, role.kibana);

          if (validationErrors.length) {
            errors[name] = {
              type: 'kibana_privilege_validation_exception',
              reason: `Role cannot be updated due to validation errors: ${JSON.stringify(
                validationErrors
              )}`,
            };

            continue;
          }

          esRoles[name] = transformPutPayloadToElasticsearchRole(
            role,
            authz.applicationName,
            rawRoles[name] ? rawRoles[name].applications : []
          );
        }

        const esResponse = await esClient.asCurrentUser.transport.request<ESRolesResponse>({
          method: 'POST',
          path: '/_security/role',
          body: { roles: esRoles },
        });

        for (const role of [...(esResponse?.created ?? []), ...(esResponse?.updated ?? [])]) {
          if (roleGrantsSubFeaturePrivileges(features, request.body.roles[role])) {
            getFeatureUsageService().recordSubFeaturePrivilegeUsage();
          }
        }

        return response.ok({
          body: {
            created: esResponse.created,
            noop: esResponse.noop,
            updated: esResponse.updated,
            ...((esResponse.errors || Object.keys(errors).length) && {
              errors: { ...errors, ...(esResponse.errors?.details ?? {}) },
            }),
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}

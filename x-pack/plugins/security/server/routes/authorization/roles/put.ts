/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { Feature } from '../../../../../features/common';
import { RouteDefinitionParams } from '../../index';
import { createLicensedRouteHandler } from '../../licensed_route_handler';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import {
  ElasticsearchRole,
  getPutPayloadSchema,
  transformPutPayloadToElasticsearchRole,
} from './model';

const roleGrantsSubFeaturePrivileges = (
  features: Feature[],
  role: TypeOf<ReturnType<typeof getPutPayloadSchema>>
) => {
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
  clusterClient,
  getFeatures,
  getFeatureUsageService,
}: RouteDefinitionParams) {
  router.put(
    {
      path: '/api/security/role/{name}',
      validate: {
        params: schema.object({ name: schema.string({ minLength: 1, maxLength: 1024 }) }),
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

      try {
        const rawRoles: Record<string, ElasticsearchRole> = await clusterClient
          .asScoped(request)
          .callAsCurrentUser('shield.getRole', {
            name: request.params.name,
            ignore: [404],
          });

        const body = transformPutPayloadToElasticsearchRole(
          request.body,
          authz.applicationName,
          rawRoles[name] ? rawRoles[name].applications : []
        );

        const [features] = await Promise.all<Feature[]>([
          getFeatures(),
          clusterClient
            .asScoped(request)
            .callAsCurrentUser('shield.putRole', { name: request.params.name, body }),
        ]);

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

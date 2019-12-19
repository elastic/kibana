/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLicensedRouteHandler } from '../licensed_route_handler';
import { getEnabledRoleMappingsFeatures } from '../../role_mappings';
import { RouteDefinitionParams } from '..';

export function defineRoleMappingFeatureCheckRoute({
  router,
  clusterClient,
  logger,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/role_mapping_feature_check',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { has_all_requested: canManageRoleMappings } = await clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.hasPrivileges', {
          body: {
            cluster: ['manage_security'],
          },
        });

      if (!canManageRoleMappings) {
        return response.ok({
          body: {
            canManageRoleMappings,
          },
        });
      }

      const enabledFeatures = await getEnabledRoleMappingsFeatures({
        clusterClient,
        logger,
      });

      return response.ok({
        body: {
          ...enabledFeatures,
          canManageRoleMappings,
        },
      });
    })
  );
}

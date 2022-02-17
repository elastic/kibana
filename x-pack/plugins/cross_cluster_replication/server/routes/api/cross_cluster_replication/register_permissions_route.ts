/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Returns whether the user has CCR permissions
 */
export const registerPermissionsRoute = ({
  router,
  license,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/permissions'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      const { client } = context.core.elasticsearch;

      if (!license.isEsSecurityEnabled) {
        // If security has been disabled in elasticsearch.yml. we'll just let the user use CCR
        // because permissions are irrelevant.
        return response.ok({
          body: {
            hasPermission: true,
            missingClusterPrivileges: [],
          },
        });
      }

      try {
        const { has_all_requested: hasPermission, cluster } =
          await client.asCurrentUser.security.hasPrivileges({
            body: {
              cluster: ['manage', 'manage_ccr'],
            },
          });

        const missingClusterPrivileges = Object.keys(cluster).reduce(
          (permissions: string[], permissionName: string) => {
            if (!cluster[permissionName]) {
              permissions.push(permissionName);
            }
            return permissions;
          },
          []
        );

        return response.ok({
          body: {
            hasPermission,
            missingClusterPrivileges,
          },
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
};

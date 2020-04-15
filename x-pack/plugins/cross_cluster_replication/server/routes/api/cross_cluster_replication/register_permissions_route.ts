/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addBasePath } from '../../../services';
import { RouteDependencies } from '../../../types';

/**
 * Returns whether the user has CCR permissions
 */
export const registerPermissionsRoute = ({
  router,
  license,
  lib: { isEsError, formatEsError },
  security,
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/permissions'),
      validate: false,
    },
    license.guardApiRoute(async (context, request, response) => {
      if (!security) {
        // If security isn't enabled or available (in the case where security is enabled but license reverted to Basic) let the user use CCR.
        return response.ok({
          body: {
            hasPermission: true,
            missingClusterPrivileges: [],
          },
        });
      }

      try {
        const {
          has_all_requested: hasPermission,
          cluster,
        } = await context.crossClusterReplication!.client.callAsCurrentUser('ccr.permissions', {
          body: {
            cluster: ['manage', 'manage_ccr'],
          },
        });

        const missingClusterPrivileges = Object.keys(cluster).reduce(
          (permissions: any, permissionName: any) => {
            if (!cluster[permissionName]) {
              permissions.push(permissionName);
              return permissions;
            }
          },
          [] as any[]
        );

        return response.ok({
          body: {
            hasPermission,
            missingClusterPrivileges,
          },
        });
      } catch (err) {
        if (isEsError(err)) {
          return response.customError(formatEsError(err));
        }
        // Case: default
        return response.internalError({ body: err });
      }
    })
  );
};

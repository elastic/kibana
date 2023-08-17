/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IScopedClusterClient } from '@kbn/core/server';
import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';
import {
  getPrivilegesAndCapabilities,
  type PrivilegesAndCapabilities,
} from '../../../common/privilege/has_privilege_factory';
import {
  addInternalBasePath,
  APP_CLUSTER_PRIVILEGES,
  APP_INDEX_PRIVILEGES,
} from '../../../common/constants';

import type { RouteDependencies } from '../../types';

export function registerPrivilegesRoute({ router, license }: RouteDependencies) {
  router.versioned
    .get({
      path: addInternalBasePath('privileges'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, undefined>(
      {
        version: '1',
        validate: false,
      },
      license.guardApiRoute<undefined, undefined, undefined>(
        async (ctx, req, res): Promise<IKibanaResponse<PrivilegesAndCapabilities>> => {
          if (license.getStatus().isSecurityEnabled === false) {
            // If security isn't enabled, let the user use app.
            return res.ok({
              body: getPrivilegesAndCapabilities({}, true, true),
            });
          }

          const esClient: IScopedClusterClient = (await ctx.core).elasticsearch.client;

          const esClusterPrivilegesReq: Promise<SecurityHasPrivilegesResponse> =
            esClient.asCurrentUser.security.hasPrivileges({
              body: {
                cluster: APP_CLUSTER_PRIVILEGES,
              },
            });
          const [esClusterPrivileges, userPrivileges] = await Promise.all([
            // Get cluster privileges
            esClusterPrivilegesReq,
            // // Get all index privileges the user has
            esClient.asCurrentUser.security.getUserPrivileges(),
          ]);

          const { has_all_requested: hasAllPrivileges, cluster } = esClusterPrivileges;
          const { indices } = userPrivileges;

          // Check if they have all the required index privileges for at least one index
          const hasOneIndexWithAllPrivileges =
            indices.find(({ privileges }: { privileges: string[] }) => {
              if (privileges.includes('all')) {
                return true;
              }

              const indexHasAllPrivileges = APP_INDEX_PRIVILEGES.every((privilege) =>
                privileges.includes(privilege)
              );

              return indexHasAllPrivileges;
            }) !== undefined;

          return res.ok({
            body: getPrivilegesAndCapabilities(
              cluster,
              hasOneIndexWithAllPrivileges,
              hasAllPrivileges
            ),
          });
        }
      )
    );
}

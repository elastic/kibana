/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrivilegesAndCapabilities } from '../../../common/privilege/has_privilege_factory';
import { APP_CLUSTER_PRIVILEGES, APP_INDEX_PRIVILEGES } from '../../../common/constants';
import { Privileges } from '../../../common/types/privileges';

import { RouteDependencies } from '../../types';
import { addBasePath } from '..';

export function registerPrivilegesRoute({ router, license }: RouteDependencies) {
  router.get(
    { path: addBasePath('privileges'), validate: {} },
    license.guardApiRoute(async (ctx, req, res) => {
      const privilegesResult: Privileges = {
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [],
          index: [],
        },
      };

      if (license.getStatus().isSecurityEnabled === false) {
        // If security isn't enabled, let the user use app.
        return res.ok({ body: privilegesResult });
      }

      const esClient = (await ctx.core).elasticsearch.client;
      // Get cluster privileges
      const { has_all_requested: hasAllPrivileges, cluster } =
        await esClient.asCurrentUser.security.hasPrivileges({
          body: {
            // @ts-expect-error SecurityClusterPrivilege doesn’t contain all the priviledges
            cluster: APP_CLUSTER_PRIVILEGES,
          },
        });

      // Get all index privileges the user has
      const { indices } = await esClient.asCurrentUser.security.getUserPrivileges();

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
        body: getPrivilegesAndCapabilities(cluster, hasOneIndexWithAllPrivileges, hasAllPrivileges),
      });
    })
  );
}

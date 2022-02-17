/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_CLUSTER_PRIVILEGES, APP_INDEX_PRIVILEGES } from '../../../common/constants';
import { Privileges } from '../../../common/types/privileges';

import { RouteDependencies } from '../../types';
import { addBasePath } from '../index';

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

      // Get cluster privileges
      const { has_all_requested: hasAllPrivileges, cluster } =
        await ctx.core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
          body: {
            // @ts-expect-error SecurityClusterPrivilege doesn’t contain all the priviledges
            cluster: APP_CLUSTER_PRIVILEGES,
          },
        });

      // Find missing cluster privileges and set overall app privileges
      privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(cluster);
      privilegesResult.hasAllPrivileges = hasAllPrivileges;

      // Get all index privileges the user has
      const { indices } =
        await ctx.core.elasticsearch.client.asCurrentUser.security.getUserPrivileges();

      // Check if they have all the required index privileges for at least one index
      const oneIndexWithAllPrivileges = indices.find(({ privileges }: { privileges: string[] }) => {
        if (privileges.includes('all')) {
          return true;
        }

        const indexHasAllPrivileges = APP_INDEX_PRIVILEGES.every((privilege) =>
          privileges.includes(privilege)
        );

        return indexHasAllPrivileges;
      });

      // If they don't, return list of required index privileges
      if (!oneIndexWithAllPrivileges) {
        privilegesResult.missingPrivileges.index = [...APP_INDEX_PRIVILEGES];
      }

      return res.ok({ body: privilegesResult });
    })
  );
}

const extractMissingPrivileges = (privilegesObject: { [key: string]: boolean } = {}): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (!privilegesObject[privilegeName]) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);

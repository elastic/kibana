/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Privileges } from '@kbn/es-ui-shared-plugin/common';
import { schema } from '@kbn/config-schema';
import { RouteDependencies } from '../../types';
import { API_BASE_PATH, APP_CLUSTER_REQUIRED_PRIVILEGES } from '../../../common/constants';

const requiredPrivilegesMap = {
  ingest_pipelines: APP_CLUSTER_REQUIRED_PRIVILEGES,
  manage_processors: ['manage'],
};
const extractMissingPrivileges = (privilegesObject: { [key: string]: boolean } = {}): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (!privilegesObject[privilegeName]) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);

export const registerPrivilegesRoute = ({ router, config }: RouteDependencies) => {
  router.get(
    {
      path: `${API_BASE_PATH}/privileges/{permissions_type}`,
      validate: {
        params: schema.object({
          permissions_type: schema.oneOf([
            schema.literal('ingest_pipelines'),
            schema.literal('manage_processors'),
          ]),
        }),
      },
    },
    async (ctx, req, res) => {
      const permissionsType = req.params.permissions_type;
      const privilegesResult: Privileges = {
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [],
        },
      };

      // Skip the privileges check if security is not enabled
      if (!config.isSecurityEnabled()) {
        return res.ok({ body: privilegesResult });
      }

      const { client: clusterClient } = (await ctx.core).elasticsearch;

      const requiredPrivileges = requiredPrivilegesMap[permissionsType];
      const { has_all_requested: hasAllPrivileges, cluster } =
        await clusterClient.asCurrentUser.security.hasPrivileges({
          body: { cluster: requiredPrivileges },
        });

      if (!hasAllPrivileges) {
        privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(cluster);
      }

      privilegesResult.hasAllPrivileges = hasAllPrivileges;

      return res.ok({ body: privilegesResult });
    }
  );
};

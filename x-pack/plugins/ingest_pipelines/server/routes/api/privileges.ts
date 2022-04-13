/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../../types';
import { API_BASE_PATH, APP_CLUSTER_REQUIRED_PRIVILEGES } from '../../../common/constants';
import { Privileges } from '../../../../../../src/plugins/es_ui_shared/common';

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
      path: `${API_BASE_PATH}/privileges`,
      validate: false,
    },
    async (ctx, req, res) => {
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

      const { client: clusterClient } = ctx.core.elasticsearch;

      const { has_all_requested: hasAllPrivileges, cluster } =
        await clusterClient.asCurrentUser.security.hasPrivileges({
          // @ts-expect-error @elastic/elasticsearch SecurityClusterPrivilege doesn’t contain all the priviledges
          body: { cluster: APP_CLUSTER_REQUIRED_PRIVILEGES },
        });

      if (!hasAllPrivileges) {
        privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(cluster);
      }

      privilegesResult.hasAllPrivileges = hasAllPrivileges;

      return res.ok({ body: privilegesResult });
    }
  );
};

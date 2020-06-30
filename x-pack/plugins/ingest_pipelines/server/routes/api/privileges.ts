/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const registerPrivilegesRoute = ({ license, router, config }: RouteDependencies) => {
  router.get(
    {
      path: `${API_BASE_PATH}/privileges`,
      validate: false,
    },
    license.guardApiRoute(async (ctx, req, res) => {
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

      const {
        core: {
          elasticsearch: {
            legacy: { client },
          },
        },
      } = ctx;

      try {
        const { has_all_requested: hasAllPrivileges, cluster } = await client.callAsCurrentUser(
          'transport.request',
          {
            path: '/_security/user/_has_privileges',
            method: 'POST',
            body: {
              cluster: APP_CLUSTER_REQUIRED_PRIVILEGES,
            },
          }
        );

        if (!hasAllPrivileges) {
          privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(cluster);
        }

        privilegesResult.hasAllPrivileges = hasAllPrivileges;

        return res.ok({ body: privilegesResult });
      } catch (e) {
        return res.internalError({ body: e });
      }
    })
  );
};

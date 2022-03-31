/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Privileges } from 'src/plugins/es_ui_shared/public';
import { RouteDependencies } from '../../../types';
import { addBasePath } from '../index';

const extractMissingPrivileges = (privilegesObject: { [key: string]: boolean } = {}): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (!privilegesObject[privilegeName]) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);

export const registerPrivilegesRoute = ({
  router,
  config,
  lib: { handleEsError },
}: RouteDependencies) => {
  router.get(
    {
      path: addBasePath('/component_templates/privileges'),
      validate: false,
    },
    async (context, request, response) => {
      const privilegesResult: Privileges = {
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [],
        },
      };

      // Skip the privileges check if security is not enabled
      if (!config.isSecurityEnabled()) {
        return response.ok({ body: privilegesResult });
      }

      const { client } = context.core.elasticsearch;

      try {
        const { has_all_requested: hasAllPrivileges, cluster } =
          await client.asCurrentUser.security.hasPrivileges({
            body: {
              cluster: ['manage_index_templates'],
            },
          });

        if (!hasAllPrivileges) {
          privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(cluster);
        }

        privilegesResult.hasAllPrivileges = hasAllPrivileges;
        return response.ok({ body: privilegesResult });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );
};

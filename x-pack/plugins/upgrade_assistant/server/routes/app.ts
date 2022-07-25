/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_BASE_PATH, DEPRECATION_LOGS_INDEX } from '../../common/constants';
import { versionCheckHandlerWrapper } from '../lib/es_version_precheck';
import { Privileges } from '../shared_imports';
import { RouteDependencies } from '../types';

const extractMissingPrivileges = (
  privilegesObject: { [key: string]: Record<string, boolean> } = {}
): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (Object.values(privilegesObject[privilegeName]).some((e) => !e)) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);

export function registerAppRoutes({
  router,
  lib: { handleEsError },
  config: { isSecurityEnabled },
}: RouteDependencies) {
  router.get(
    {
      path: `${API_BASE_PATH}/privileges`,
      validate: false,
    },
    versionCheckHandlerWrapper(async ({ core }, request, response) => {
      const {
        elasticsearch: { client },
      } = await core;
      const privilegesResult: Privileges = {
        hasAllPrivileges: true,
        missingPrivileges: {
          index: [],
        },
      };

      if (!isSecurityEnabled()) {
        return response.ok({ body: privilegesResult });
      }

      try {
        const { has_all_requested: hasAllPrivileges, index } =
          await client.asCurrentUser.security.hasPrivileges({
            body: {
              index: [
                {
                  names: [DEPRECATION_LOGS_INDEX],
                  privileges: ['read'],
                },
              ],
            },
          });

        if (!hasAllPrivileges) {
          privilegesResult.missingPrivileges.index = extractMissingPrivileges(index);
        }

        privilegesResult.hasAllPrivileges = hasAllPrivileges;
        return response.ok({ body: privilegesResult });
      } catch (error) {
        return handleEsError({ error, response });
      }
    })
  );
}

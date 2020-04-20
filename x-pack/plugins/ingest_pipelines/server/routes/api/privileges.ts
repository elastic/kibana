/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RouteDependencies } from '../../types';
import { API_BASE_PATH, APP_REQUIRED_PRIVILEGE } from '../../../common/constants';
import { Privileges } from '../../../../../../src/plugins/es_ui_shared/public';

export const registerPrivilegesRoute = ({ license, router }: RouteDependencies) => {
  router.get(
    {
      path: `${API_BASE_PATH}/privileges`,
      validate: false,
    },
    license.guardApiRoute(async (ctx, req, res) => {
      const {
        core: {
          elasticsearch: { dataClient },
        },
      } = ctx;

      const privilegesResult: Privileges = {
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [],
        },
      };

      try {
        const { has_all_requested: hasAllPrivileges } = await dataClient.callAsCurrentUser(
          'transport.request',
          {
            path: '/_security/user/_has_privileges',
            method: 'POST',
            body: {
              cluster: [APP_REQUIRED_PRIVILEGE],
            },
          }
        );

        if (!hasAllPrivileges) {
          privilegesResult.missingPrivileges.cluster = [APP_REQUIRED_PRIVILEGE];
        }

        privilegesResult.hasAllPrivileges = hasAllPrivileges;

        return res.ok({ body: privilegesResult });
      } catch (e) {
        return res.internalError(e);
      }
    })
  );
};

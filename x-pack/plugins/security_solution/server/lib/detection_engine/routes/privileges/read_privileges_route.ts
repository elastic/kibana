/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash/fp';

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_PRIVILEGES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildSiemResponse, transformError } from '../utils';
import { readPrivileges } from '../../privileges/read_privileges';

export const readPrivilegesRoute = (
  router: IRouter,
  security: SetupPlugins['security'],
  usingEphemeralEncryptionKey: boolean
) => {
  router.get(
    {
      path: DETECTION_ENGINE_PRIVILEGES_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const clusterClient = context.core.elasticsearch.legacy.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const index = siemClient.getSignalsIndex();
        const clusterPrivileges = await readPrivileges(clusterClient.callAsCurrentUser, index);
        const privileges = merge(clusterPrivileges, {
          is_authenticated: security?.authc.isAuthenticated(request) ?? false,
          has_encryption_key: !usingEphemeralEncryptionKey,
        });

        return response.ok({ body: privileges });
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};

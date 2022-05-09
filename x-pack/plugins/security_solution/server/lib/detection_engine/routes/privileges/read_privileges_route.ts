/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash/fp';

import { readPrivileges, transformError } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_PRIVILEGES_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

export const readPrivilegesRoute = (
  router: SecuritySolutionPluginRouter,
  hasEncryptionKey: boolean
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
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const spaceId = securitySolution.getSpaceId();
        const index = securitySolution
          .getRuleDataService()
          .getResourceName(`security.alerts-${spaceId}`);
        const clusterPrivileges = await readPrivileges(esClient, index);
        const privileges = merge(clusterPrivileges, {
          is_authenticated: request.auth.isAuthenticated ?? false,
          has_encryption_key: hasEncryptionKey,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError, getIndexExists } from '@kbn/securitysolution-es-utils';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_ALERTS_INDEX_URL } from '../../../../../common/constants';

import { buildSiemResponse } from '../utils';

export const readAlertsIndexExistsRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_ALERTS_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const siemClient = securitySolution?.getAppClient();

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const index = siemClient.getSignalsIndex();

        const indexExists = await getIndexExists(core.elasticsearch.client.asInternalUser, index);
        return response.ok({
          body: {
            indexExists,
          },
        });
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

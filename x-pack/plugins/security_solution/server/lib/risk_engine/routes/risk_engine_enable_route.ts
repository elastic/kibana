/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RISK_ENGINE_ENABLE_URL } from '../../../../common/constants';

import type { SecuritySolutionPluginRouter } from '../../../types';

import { riskScoreService } from '../risk_score_service';

export const riskEngineEnableRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: RISK_ENGINE_ENABLE_URL,
      validate: {},
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const soClient = (await context.core).savedObjects.client;
      const siemClient = (await context.securitySolution).getAppClient();
      const riskScore = riskScoreService({
        esClient,
        logger,
      });

      try {
        return response.ok({ body: { isOK: 'ok' } });
      } catch (e) {
        const error = transformError(e);

        return siemResponse.error({
          statusCode: error.statusCode,
          body: { message: error.message, full_error: JSON.stringify(e) },
        });
      }
    }
  );
};

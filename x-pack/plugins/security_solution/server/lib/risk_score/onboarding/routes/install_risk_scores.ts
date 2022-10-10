/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';

import { INTERNAL_RISK_SCORE_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

import type { SetupPlugins } from '../../../../plugin';

import { buildSiemResponse } from '../../../detection_engine/routes/utils';

import { installRiskScoreModule } from '../helpers/install_risk_score_module';
import { onboardingRiskScoreSchema } from '../schema';

export const installRiskScoresRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: INTERNAL_RISK_SCORE_URL,
      validate: onboardingRiskScoreSchema,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { riskScoreEntity } = request.body;

      try {
        const securitySolution = await context.securitySolution;

        const spaceId = securitySolution?.getSpaceId();

        const { client } = (await context.core).elasticsearch;
        const esClient = client.asCurrentUser;
        const res = await installRiskScoreModule({
          esClient,
          logger,
          riskScoreEntity,
          spaceId,
        });

        return response.ok({
          body: res,
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

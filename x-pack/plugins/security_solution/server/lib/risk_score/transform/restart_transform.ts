/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import { RISK_SCORE_RESTART_TRANSFORMS } from '../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../types';

import { buildSiemResponse } from '../../detection_engine/routes/utils';

import { RiskScoreEntity } from '../../../../common/search_strategy';
import { restartTransform } from './helpers/transforms';
import {
  getRiskScoreLatestTransformId,
  getRiskScorePivotTransformId,
} from '../../../../common/utils/risk_score_modules';

const restartRiskScoreTransformsSchema = {
  body: schema.object({
    riskScoreEntity: schema.oneOf([
      schema.literal(RiskScoreEntity.host),
      schema.literal(RiskScoreEntity.user),
    ]),
  }),
};

export const restartTransformRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: RISK_SCORE_RESTART_TRANSFORMS,
      validate: restartRiskScoreTransformsSchema,
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
        const restartPivotTransformResult = await restartTransform(
          esClient,
          getRiskScorePivotTransformId(riskScoreEntity, spaceId),
          logger
        );

        const restartLatestTransformResult = await restartTransform(
          esClient,
          getRiskScoreLatestTransformId(riskScoreEntity, spaceId),
          logger
        );

        return response.ok({
          body: [restartPivotTransformResult, restartLatestTransformResult],
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

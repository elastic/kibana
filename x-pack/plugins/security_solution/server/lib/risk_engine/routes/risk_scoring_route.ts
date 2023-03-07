/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IdentifierType } from '../types';
import { RISK_SCORES_URL } from '../../../../common/constants';
import { riskScoresRequestSchema } from '../../../../common/risk_engine/risk_scoring/risk_scores_request_schema';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { buildRiskScoreService } from '../risk_score_service';

export const riskScoringRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.post(
    {
      path: RISK_SCORES_URL,
      validate: { body: buildRouteValidation(riskScoresRequestSchema) },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;
      const options = request.body; // TODO why is this any???
      const riskScoreService = buildRiskScoreService({
        esClient,
      });

      try {
        const result = await riskScoreService.getScores({
          enrichInputs: options.enrich_inputs,
          filters: options.filters ?? [],
          range: options.range ?? { start: 'now-15d', end: 'now' },
          identifierType: options.identifier_type as IdentifierType, // TODO validate
        });

        return response.ok({ body: result });
      } catch (e) {
        const error = transformError(e);
        return siemResponse.error({ statusCode: error.statusCode, body: error.message });
      }
    }
  );
};

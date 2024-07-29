/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APPLY_RECOMMENDATIONS_URL } from '../../../common/recommendations';
import { createValidationFunction } from '../../../common/runtime_types';
import * as recommendationsV1 from '../../../common/recommendations/v1';
import { LogsOptimizationBackendLibs } from '../../lib/shared_types';
import { RecommendationNotFoundError } from '../../services/recommendations/errors';

export const initApplyRecommendationRoute = ({
  router,
  getStartServices,
}: LogsOptimizationBackendLibs) => {
  router.versioned
    .put({
      access: 'internal',
      path: APPLY_RECOMMENDATIONS_URL,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: createValidationFunction(recommendationsV1.applyRecommendationRequestParamsRT),
            body: createValidationFunction(recommendationsV1.applyRecommendationRequestPayloadRT),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { recommendationId } = request.params;
        const { dataStream, tasks } = request.body;

        const [_core, _startDeps, startContract] = await getStartServices();
        const recommendationsClient = await startContract.recommendationsService.getScopedClient(
          request
        );

        try {
          const recommendation = await recommendationsClient.applyRecommendation({
            id: recommendationId,
            dataStream,
            tasks,
          });

          const responsePayload: recommendationsV1.ApplyRecommendationResponsePayload = {
            recommendation,
          };

          return response.ok({
            body: recommendationsV1.applyRecommendationResponsePayloadRT.encode(responsePayload),
          });
        } catch (error) {
          if (error instanceof RecommendationNotFoundError) {
            return response.badRequest({
              body: {
                message: error.message,
              },
            });
          }

          return response.customError({
            statusCode: error.statusCode ?? 500,
            body: {
              message: error.message ?? 'An unexpected error occurred',
            },
          });
        }
      }
    );
};

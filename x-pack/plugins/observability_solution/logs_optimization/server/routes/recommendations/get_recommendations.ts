/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GET_RECOMMENDATIONS_URL } from '../../../common/recommendations';
import { createValidationFunction } from '../../../common/runtime_types';
import * as recommendationsV1 from '../../../common/recommendations/v1';
import { LogsOptimizationBackendLibs } from '../../lib/shared_types';

export const initGetRecommendationsRoute = ({
  router,
  getStartServices,
}: LogsOptimizationBackendLibs) => {
  router.versioned
    .get({
      access: 'internal',
      path: GET_RECOMMENDATIONS_URL,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: createValidationFunction(recommendationsV1.getRecommendationsRequestQueryRT),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { dataStream } = request.query;

        const [_core, _startDeps, startContract] = await getStartServices();
        const recommendationsClient = await startContract.recommendationsService.getScopedClient(
          request
        );

        try {
          const recommendations = await recommendationsClient.getRecommendations({ dataStream });

          const responsePayload: recommendationsV1.GetRecommendationsResponsePayload = {
            recommendations,
          };

          return response.ok({
            body: recommendationsV1.getRecommendationsResponsePayloadRT.encode(responsePayload),
          });
        } catch (error) {
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

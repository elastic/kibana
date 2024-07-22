/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { LogsOptimizationBackendLibs } from './lib/shared_types';

export const initLogsOptimizationServer = (libs: LogsOptimizationBackendLibs) => {
  libs.router.versioned
    .get({
      access: 'internal',
      path: '/internal/recommendations',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: schema.object({ dataset: schema.string() }),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { dataset } = request.query;

        const [core, _startDeps, startContract] = await libs.getStartServices();
        const recommendationsClient = await startContract.recommendationsService.getScopedClient(
          request
        );

        try {
          const recommendations = await recommendationsClient.getRecommendations({ dataset });

          return response.ok({
            body: recommendations,
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

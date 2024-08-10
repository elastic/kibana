/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { SIMULATE_PIPELINE_URL } from '../../../common/recommendations';
import { createValidationFunction } from '../../../common/runtime_types';
import { LogsOptimizationBackendLibs } from '../../lib/shared_types';

export const initSimulatePipelineRoute = ({
  router,
  getStartServices,
}: LogsOptimizationBackendLibs) => {
  router.versioned
    .post({
      access: 'internal',
      path: SIMULATE_PIPELINE_URL,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: createValidationFunction(rt.any),
          },
        },
      },
      async (_requestContext, request, response) => {
        const { docs, processors } = request.body;

        const [core, _startDeps, startContract] = await getStartServices();
        const esClient = core.elasticsearch.client.asScoped(request).asCurrentUser;

        try {
          const simulationResult = await esClient.ingest.simulate({
            verbose: true,
            pipeline: {
              description: 'Pipeline simulation',
              processors,
            },
            docs,
          });

          return response.ok({
            body: simulationResult,
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

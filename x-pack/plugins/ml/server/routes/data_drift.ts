/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitialization } from '../types';
import { optionalModelIdSchema } from './schemas/inference_schema';
import { wrapError } from '../client/error_wrapper';

export function dataDriftRoutes({ router, routeGuard }: RouteInitialization) {
  router.get(
    {
      path: '/api/ml/data_drift',
      validate: {
        // @todo: add fields or index pattern instead
        params: optionalModelIdSchema,
      },
      options: {
        // @todo
        tags: ['access:ml:canGetTrainedModels'],
      },
    },
    routeGuard.fullLicenseAPIGuard(async ({ client, mlClient, request, response }) => {
      try {
        const getRangesAndKsTest = async (
          numericFieldName: Array<{ field: string; type: 'numeric' | 'categorical' }>
        ) => {
          const ranges = await client.asCurrentUser.search(
            {
              index: 'baseline',
              body: {
                size: 0,
                aggs: {
                  unchangeable_percentiles: {
                    percentiles: {
                      field: 'numeric_unchangeable',
                      percents: [
                        5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
                      ],
                    },
                  },
                },
              },
            },
            { maxRetries: 0 }
          );
        };

        const result = getRangesAndKsTest([{ field: 'numeric_unchangeable', type: 'numeric' }]);
        return response.ok({
          body: result,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}

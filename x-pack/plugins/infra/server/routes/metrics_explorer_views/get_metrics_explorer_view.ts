/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { createValidationFunction } from '../../../common/runtime_types';
import {
  metricsExplorerViewResponsePayloadRT,
  metricsExplorerViewRequestQueryRT,
  METRICS_EXPLORER_VIEW_URL_ENTITY,
  getMetricsExplorerViewRequestParamsRT,
} from '../../../common/http_api/latest';
import type { InfraBackendLibs } from '../../lib/infra_types';

export const initGetMetricsExplorerViewRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'get',
      path: METRICS_EXPLORER_VIEW_URL_ENTITY,
      validate: {
        params: createValidationFunction(getMetricsExplorerViewRequestParamsRT),
        query: createValidationFunction(metricsExplorerViewRequestQueryRT),
      },
    },
    async (_requestContext, request, response) => {
      const { params, query } = request;
      const [, , { metricsExplorerViews }] = await getStartServices();
      const metricsExplorerViewsClient = metricsExplorerViews.getScopedClient(request);

      try {
        const metricsExplorerView = await metricsExplorerViewsClient.get(
          params.metricsExplorerViewId,
          query
        );

        return response.ok({
          body: metricsExplorerViewResponsePayloadRT.encode({ data: metricsExplorerView }),
        });
      } catch (error) {
        if (isBoom(error)) {
          return response.customError({
            statusCode: error.output.statusCode,
            body: { message: error.output.payload.message },
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

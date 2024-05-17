/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRICS_EXPLORER_VIEW_URL,
  findMetricsExplorerViewResponsePayloadRT,
  metricsExplorerViewRequestQueryRT,
} from '../../../common/http_api/latest';
import { createValidationFunction } from '../../../common/runtime_types';
import type { InfraBackendLibs } from '../../lib/infra_types';

const NON_STARTED_SERVICE_ERROR = {
  statusCode: 500,
  body: {
    message: `Handler for "GET ${METRICS_EXPLORER_VIEW_URL}" was registered but MetricsViewService has not started.`,
  },
};

export const initFindMetricsExplorerViewRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'get',
      path: METRICS_EXPLORER_VIEW_URL,
      validate: {
        query: createValidationFunction(metricsExplorerViewRequestQueryRT),
      },
    },
    async (_requestContext, request, response) => {
      const { query } = request;
      const [, , { metricsExplorerViews }] = await getStartServices();

      if (metricsExplorerViews === undefined) {
        return response.customError(NON_STARTED_SERVICE_ERROR);
      }

      const metricsExplorerViewsClient = metricsExplorerViews.getScopedClient(request);

      try {
        const metricsExplorerViewsList = await metricsExplorerViewsClient.find(query);

        return response.ok({
          body: findMetricsExplorerViewResponsePayloadRT.encode({ data: metricsExplorerViewsList }),
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

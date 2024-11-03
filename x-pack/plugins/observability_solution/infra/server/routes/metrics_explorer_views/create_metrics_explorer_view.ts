/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  createMetricsExplorerViewRequestPayloadRT,
  metricsExplorerViewRequestQueryRT,
  metricsExplorerViewResponsePayloadRT,
  METRICS_EXPLORER_VIEW_URL,
} from '../../../common/http_api/latest';
import type { InfraBackendLibs } from '../../lib/infra_types';

const NON_STARTED_SERVICE_ERROR = {
  statusCode: 500,
  body: {
    message: `Handler for "POST ${METRICS_EXPLORER_VIEW_URL}" was registered but MetricsViewService has not started.`,
  },
};

export const initCreateMetricsExplorerViewRoute = ({
  framework,
  getStartServices,
}: Pick<InfraBackendLibs, 'framework' | 'getStartServices'>) => {
  framework.registerRoute(
    {
      method: 'post',
      path: METRICS_EXPLORER_VIEW_URL,
      validate: {
        body: createRouteValidationFunction(createMetricsExplorerViewRequestPayloadRT),
        query: createRouteValidationFunction(metricsExplorerViewRequestQueryRT),
      },
    },
    async (_requestContext, request, response) => {
      const { body, query } = request;
      const [, , { metricsExplorerViews }] = await getStartServices();

      if (metricsExplorerViews === undefined) {
        return response.customError(NON_STARTED_SERVICE_ERROR);
      }

      const metricsExplorerViewsClient = metricsExplorerViews.getScopedClient(request);

      try {
        const metricsExplorerView = await metricsExplorerViewsClient.update(
          null,
          body.attributes,
          query
        );

        return response.custom({
          statusCode: 201,
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

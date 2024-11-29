/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import Boom from '@hapi/boom';
import { METRICS_EXPLORER_API_MAX_METRICS } from '../../../common/constants';
import {
  metricsExplorerRequestBodyRT,
  metricsExplorerResponseRT,
  MetricsExplorerPageInfo,
} from '../../../common/http_api/metrics_explorer';
import { convertRequestToMetricsAPIOptions } from './lib/convert_request_to_metrics_api_options';
import { createSearchClient } from '../../lib/create_search_client';
import { findIntervalForMetrics } from './lib/find_interval_for_metrics';
import { query } from '../../lib/metrics';
import { queryTotalGroupings } from './lib/query_total_groupings';
import { transformSeries } from './lib/transform_series';
import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';

export const initMetricExplorerRoute = (framework: KibanaFramework) => {
  const validateBody = createRouteValidationFunction(metricsExplorerRequestBodyRT);
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/metrics_explorer',
      validate: {
        body: validateBody,
      },
    },
    async (requestContext, request, response) => {
      const options = request.body;

      try {
        if (options.metrics.length > METRICS_EXPLORER_API_MAX_METRICS) {
          throw Boom.badRequest(
            `'metrics' size is greater than maximum of ${METRICS_EXPLORER_API_MAX_METRICS} allowed.`
          );
        }

        const client = createSearchClient(requestContext, framework);
        const interval = await findIntervalForMetrics(client, options);

        const optionsWithInterval = options.forceInterval
          ? options
          : {
              ...options,
              timerange: {
                ...options.timerange,
                interval: interval ? `>=${interval}s` : options.timerange.interval,
              },
            };

        const metricsApiOptions = convertRequestToMetricsAPIOptions(optionsWithInterval);
        const metricsApiResponse = await query(client, metricsApiOptions);
        const totalGroupings = await queryTotalGroupings(client, metricsApiOptions);
        const hasGroupBy =
          Array.isArray(metricsApiOptions.groupBy) && metricsApiOptions.groupBy.length > 0;

        const pageInfo: MetricsExplorerPageInfo = {
          total: totalGroupings,
          afterKey: null,
        };

        if (metricsApiResponse.info.afterKey) {
          pageInfo.afterKey = metricsApiResponse.info.afterKey;
        }

        // If we have a groupBy but there are ZERO groupings returned then we need to
        // return an empty array. Otherwise we transform the series to match the current schema.
        const series =
          hasGroupBy && totalGroupings === 0
            ? []
            : metricsApiResponse.series.map(transformSeries(hasGroupBy));

        return response.ok({
          body: metricsExplorerResponseRT.encode({ series, pageInfo }),
        });
      } catch (err) {
        if (Boom.isBoom(err)) {
          return response.customError({
            statusCode: err.output.statusCode,
            body: { message: err.output.payload.message },
          });
        }

        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: {
            message: err.message ?? 'An unexpected error occurred',
          },
        });
      }
    }
  );
};

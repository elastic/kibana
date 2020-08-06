/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { InfraBackendLibs } from '../../lib/infra_types';
import {
  metricsExplorerRequestBodyRT,
  metricsExplorerResponseRT,
  MetricsExplorerPageInfo,
} from '../../../common/http_api';
import { throwErrors } from '../../../common/runtime_types';
import { converstRequestToMetricsAPIOptions } from './lib/convert_request_to_metrics_api_options';
import { createSearchClient } from '../../lib/create_search_client';
import { findIntervalForMetrics } from './lib/find_interval_for_metrics';
import { query } from '../../lib/metrics';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

export const initMetricExplorerRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;
  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/metrics_explorer',
      validate: {
        body: escapeHatch,
      },
    },
    async (requestContext, request, response) => {
      try {
        const options = pipe(
          metricsExplorerRequestBodyRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

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

        const metricsApiOptions = converstRequestToMetricsAPIOptions(optionsWithInterval);
        const metricsApiResponse = await query(client, metricsApiOptions);

        const pageInfo: MetricsExplorerPageInfo = {
          total: 0,
          afterKey: null,
        };

        if (metricsApiResponse.info.afterKey) {
          pageInfo.afterKey = metricsApiResponse.info.afterKey;
        }

        return response.ok({
          body: metricsExplorerResponseRT.encode({
            series: metricsApiResponse.series,
            pageInfo,
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};

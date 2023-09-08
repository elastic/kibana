/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { getClient } from './compat';
import { createCommonFilter } from './query';
import { withProfilingSpan } from '../utils/with_profiling_span';

export function registerFlameChartSearchRoute({
  router,
  logger,
  services: { createProfilingEsClient },
  dependencies: {
    start: { profilingDataAccess },
  },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.Flamechart,
      options: { tags: ['access:profiling'] },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { timeFrom, timeTo, kuery } = request.query;

      try {
        const esClient = await getClient(context);
        const flamegraph = await profilingDataAccess.services.fetchFlamechartData({
          esClient,
          rangeFromMs: timeFrom,
          rangeToMs: timeTo,
          kuery,
        });

        return response.ok({ body: flamegraph });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching flamegraph',
        });
      }
    }
  );

  router.get(
    {
      path: paths.FlamechartPoC,
      options: { tags: ['access:profiling'] },
      validate: {
        query: schema.object({
          timeFrom: schema.number(),
          timeTo: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { timeFrom, timeTo, kuery } = request.query;
      const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

      try {
        const esClient = await getClient(context);
        const profilingElasticsearchClient = createProfilingEsClient({ request, esClient });
        const filter = createCommonFilter({
          timeFrom,
          timeTo,
          kuery,
        });

        const baseFlamegraph = await withProfilingSpan('profiling_flamegraph_new_api', () => {
          return profilingElasticsearchClient.profilingFlamegraph({
            query: filter,
            sampleSize: targetSampleSize,
          });
        });

        return response.ok({ body: baseFlamegraph });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching flamegraph',
        });
      }
    }
  );
}

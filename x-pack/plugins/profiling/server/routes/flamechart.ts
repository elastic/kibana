/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { createCalleeTree } from '../../common/callee';
import { handleRouteHandlerError } from '../utils/handle_route_error_handler';
import { createBaseFlameGraph } from '../../common/flamegraph';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { createCommonFilter } from './query';
import { searchStackTraces } from './search_stacktraces';

export function registerFlameChartSearchRoute({
  router,
  logger,
  services: { createProfilingEsClient },
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
      const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

      try {
        const esClient = await getClient(context);
        const profilingElasticsearchClient = createProfilingEsClient({ request, esClient });
        const filter = createCommonFilter({
          timeFrom,
          timeTo,
          kuery,
        });
        const totalSeconds = timeTo - timeFrom;

        const { events, stackTraces, executables, stackFrames, totalFrames, samplingRate } =
          await searchStackTraces({
            client: profilingElasticsearchClient,
            filter,
            sampleSize: targetSampleSize,
          });

        const flamegraph = await withProfilingSpan('create_flamegraph', async () => {
          const tree = createCalleeTree(
            events,
            stackTraces,
            stackFrames,
            executables,
            totalFrames,
            samplingRate
          );

          const fg = createBaseFlameGraph(tree, samplingRate, totalSeconds);

          return fg;
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
}

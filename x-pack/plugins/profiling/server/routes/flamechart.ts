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
import { getStackTraces } from './get_stacktraces';
import { createCommonFilter } from './query';

export function registerFlameChartSearchRoute({
  router,
  logger,
  services: { createProfilingEsClient },
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.Flamechart,
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

        const t0 = Date.now();
        const { stackTraceEvents, stackTraces, executables, stackFrames, totalFrames } =
          await getStackTraces({
            context,
            logger,
            client: profilingElasticsearchClient,
            filter,
            sampleSize: targetSampleSize,
          });
        logger.info(`querying stacktraces took ${Date.now() - t0} ms`);

        const flamegraph = await withProfilingSpan('create_flamegraph', async () => {
          const t1 = Date.now();
          const tree = createCalleeTree(
            stackTraceEvents,
            stackTraces,
            stackFrames,
            executables,
            totalFrames
          );
          logger.info(`creating callee tree took ${Date.now() - t1} ms`);

          const t2 = Date.now();
          const fg = createBaseFlameGraph(tree, totalSeconds);
          logger.info(`creating flamegraph took ${Date.now() - t2} ms`);

          return fg;
        });

        logger.info('returning payload response to client');

        return response.ok({ body: flamegraph });
      } catch (error) {
        return handleRouteHandlerError({ error, logger, response });
      }
    }
  );
}

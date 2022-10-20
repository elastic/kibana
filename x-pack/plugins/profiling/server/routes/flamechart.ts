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
import { createProfilingEsClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { getExecutablesAndStackTraces } from './get_executables_and_stacktraces';
import { createCommonFilter } from './query';

export function registerFlameChartSearchRoute({ router, logger }: RouteRegisterParameters) {
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
        const filter = createCommonFilter({
          timeFrom,
          timeTo,
          kuery,
        });
        const totalSeconds = timeTo - timeFrom;

        const { stackTraceEvents, stackTraces, executables, stackFrames, totalFrames } =
          await getExecutablesAndStackTraces({
            logger,
            client: createProfilingEsClient({ request, esClient }),
            filter,
            sampleSize: targetSampleSize,
          });

        const flamegraph = await withProfilingSpan('create_flamegraph', async () => {
          const t0 = Date.now();
          const tree = createCalleeTree(
            stackTraceEvents,
            stackTraces,
            stackFrames,
            executables,
            totalFrames
          );
          logger.info(`creating callee tree took ${Date.now() - t0} ms`);

          const t1 = Date.now();
          const fg = createBaseFlameGraph(tree, totalSeconds);
          logger.info(`creating flamegraph took ${Date.now() - t1} ms`);

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

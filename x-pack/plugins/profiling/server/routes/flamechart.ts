/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { FlameGraph } from '../../common/flamegraph';
import { createProfilingEsClient, ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { getExecutablesAndStackTraces } from './get_executables_and_stacktraces';
import { createCommonFilter, ProjectTimeQuery } from './query';

async function queryFlameGraph({
  logger,
  client,
  filter,
  sampleSize,
}: {
  logger: Logger;
  client: ProfilingESClient;
  filter: ProjectTimeQuery;
  sampleSize: number;
}): Promise<FlameGraph> {
  return withProfilingSpan('get_flamegraph', async () => {
    return getExecutablesAndStackTraces({
      logger,
      client,
      filter,
      sampleSize,
    }).then(
      ({
        stackTraces,
        executables,
        stackFrames,
        eventsIndex,
        downsampledTotalCount,
        stackTraceEvents,
      }) => {
        return new FlameGraph(
          eventsIndex.sampleRate,
          downsampledTotalCount,
          stackTraceEvents,
          stackTraces,
          stackFrames,
          executables
        );
      }
    );
  });
}

export function registerFlameChartElasticSearchRoute({ router, logger }: RouteRegisterParameters) {
  const paths = getRoutePaths();
  router.get(
    {
      path: paths.FlamechartElastic,
      validate: {
        query: schema.object({
          timeFrom: schema.string(),
          timeTo: schema.string(),
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

        const flamegraph = await queryFlameGraph({
          logger,
          client: createProfilingEsClient({ request, esClient }),
          filter,
          sampleSize: targetSampleSize,
        });
        logger.info('returning payload response to client');

        return response.ok({
          body: flamegraph.toElastic(),
        });
      } catch (e) {
        logger.error(e);
        return response.customError({
          statusCode: e.statusCode ?? 500,
          body: {
            message: e.message,
          },
        });
      }
    }
  );
}

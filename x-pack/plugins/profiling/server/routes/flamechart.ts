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
import { getClient } from './compat';
import { downsampleEventsRandomly, findDownsampledIndex } from './downsampling';
import { logExecutionLatency } from './logger';
import { createCommonFilter, ProjectTimeQuery } from './query';
import {
  mgetExecutables,
  mgetStackFrames,
  mgetStackTraces,
  searchEventsGroupByStackTrace,
} from './stacktrace';
import { withProfilingSpan } from '../utils/with_profiling_span';

async function queryFlameGraph({
  logger,
  client,
  index,
  filter,
  sampleSize,
}: {
  logger: Logger;
  client: ProfilingESClient;
  index: string;
  filter: ProjectTimeQuery;
  sampleSize: number;
}): Promise<FlameGraph> {
  return withProfilingSpan('get_flamegraph', async () => {
    const eventsIndex = await findDownsampledIndex({ logger, client, index, filter, sampleSize });

    const { totalCount, stackTraceEvents } = await searchEventsGroupByStackTrace({
      logger,
      client,
      index: eventsIndex,
      filter,
    });

    // Manual downsampling if totalCount exceeds sampleSize by 10%.
    let downsampledTotalCount = totalCount;
    if (totalCount > sampleSize * 1.1) {
      const p = sampleSize / totalCount;
      logger.info('downsampling events with p=' + p);
      await logExecutionLatency(logger, 'downsampling events', async () => {
        downsampledTotalCount = downsampleEventsRandomly(stackTraceEvents, p, filter.toString());
      });
      logger.info('downsampled total count: ' + downsampledTotalCount);
      logger.info('unique downsampled stacktraces: ' + stackTraceEvents.size);
    }

    const { stackTraces, stackFrameDocIDs, executableDocIDs } = await mgetStackTraces({
      logger,
      client,
      events: stackTraceEvents,
    });

    return withProfilingSpan('mget_stack_frames_and_executables', () =>
      Promise.all([
        mgetStackFrames({ logger, client, stackFrameIDs: stackFrameDocIDs }),
        mgetExecutables({ logger, client, executableIDs: executableDocIDs }),
      ]).then(([stackFrames, executables]) => {
        return new FlameGraph(
          eventsIndex.sampleRate,
          downsampledTotalCount,
          stackTraceEvents,
          stackTraces,
          stackFrames,
          executables
        );
      })
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
          index: schema.string(),
          projectID: schema.string(),
          timeFrom: schema.string(),
          timeTo: schema.string(),
          n: schema.number({ defaultValue: 200 }),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { index, projectID, timeFrom, timeTo, kuery } = request.query;
      const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

      try {
        const esClient = await getClient(context);
        const filter = createCommonFilter({
          projectID,
          timeFrom,
          timeTo,
          kuery,
        });

        const flamegraph = await queryFlameGraph({
          logger,
          client: createProfilingEsClient({ request, esClient }),
          index,
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

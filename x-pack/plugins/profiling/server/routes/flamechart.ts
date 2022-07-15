/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { RouteRegisterParameters } from '.';
import { getRoutePaths } from '../../common';
import { FlameGraph } from '../../common/flamegraph';
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

async function queryFlameGraph(
  logger: Logger,
  client: ElasticsearchClient,
  index: string,
  filter: ProjectTimeQuery,
  sampleSize: number
): Promise<FlameGraph> {
  const eventsIndex = await logExecutionLatency(
    logger,
    'query to find downsampled index',
    async () => {
      return await findDownsampledIndex(logger, client, index, filter, sampleSize);
    }
  );

  const { totalCount, stackTraceEvents } = await searchEventsGroupByStackTrace(
    logger,
    client,
    eventsIndex,
    filter
  );

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

  const { stackTraces, stackFrameDocIDs, executableDocIDs } = await mgetStackTraces(
    logger,
    client,
    stackTraceEvents
  );

  return Promise.all([
    mgetStackFrames(logger, client, stackFrameDocIDs),
    mgetExecutables(logger, client, executableDocIDs),
  ]).then(([stackFrames, executables]) => {
    return new FlameGraph(
      eventsIndex.sampleRate,
      downsampledTotalCount,
      stackTraceEvents,
      stackTraces,
      stackFrames,
      executables
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

        const flamegraph = await queryFlameGraph(
          logger,
          esClient,
          index!,
          filter,
          targetSampleSize
        );
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

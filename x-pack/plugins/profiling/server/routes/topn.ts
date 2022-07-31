/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { RouteRegisterParameters } from '.';
import { fromMapToRecord, getRoutePaths, INDEX_EVENTS } from '../../common';
import { groupStackFrameMetadataByStackTrace, StackTraceID } from '../../common/profiling';
import { getFieldNameForTopNType, TopNType } from '../../common/stack_traces';
import { createTopNSamples } from '../../common/topn';
import { ProfilingRequestHandlerContext } from '../types';
import { createProfilingEsClient, ProfilingESClient } from '../utils/create_profiling_es_client';
import { getClient } from './compat';
import { findDownsampledIndex } from './downsampling';
import {
  aggregateByFieldAndTimestamp,
  createCommonFilter,
  findFixedIntervalForBucketsPerTimeRange,
} from './query';
import { mgetExecutables, mgetStackFrames, mgetStackTraces } from './stacktrace';

export async function topNElasticSearchQuery({
  client,
  logger,
  timeFrom,
  timeTo,
  searchField,
  response,
  kuery,
}: {
  client: ProfilingESClient;
  logger: Logger;
  timeFrom: number;
  timeTo: number;
  searchField: string;
  response: KibanaResponseFactory;
  kuery: string;
}) {
  const filter = createCommonFilter({ timeFrom, timeTo, kuery });
  const targetSampleSize = 20000; // minimum number of samples to get statistically sound results
  const fixedInterval = findFixedIntervalForBucketsPerTimeRange(timeFrom, timeTo, 50);

  const eventsIndex = await findDownsampledIndex({
    logger,
    client,
    index: INDEX_EVENTS,
    filter,
    sampleSize: targetSampleSize,
  });

  const resEvents = await client.search('get_top_n_histogram', {
    index: eventsIndex.name,
    size: 0,
    query: filter,
    aggs: {
      histogram: aggregateByFieldAndTimestamp(searchField, fixedInterval),
      total_count: {
        sum: {
          field: 'Count',
        },
      },
    },
    // Adrien and Dario found out this is a work-around for some bug in 8.1.
    // It reduces the query time by avoiding unneeded searches.
    pre_filter_shard_size: 1,
  });

  if (!resEvents.aggregations) {
    return response.ok({
      body: {
        TopN: [],
        Metadata: {},
      },
    });
  }

  const {
    histogram,
    total_count: { value: totalSampledStackTraces },
  } = resEvents.aggregations;
  const topN = createTopNSamples(histogram);

  logger.info('total sampled stacktraces: ' + totalSampledStackTraces);

  if (searchField !== 'StackTraceID') {
    return response.ok({
      body: { TopN: topN, Metadata: {} },
    });
  }

  const stackTraceEvents = new Map<StackTraceID, number>();
  const histogramBuckets = histogram?.buckets ?? [];
  let totalAggregatedStackTraces = 0;

  for (let i = 0; i < histogramBuckets.length; i++) {
    const stackTraceID = String(histogramBuckets[i].key);
    const count = histogramBuckets[i].count.value ?? 0;
    totalAggregatedStackTraces += count;
    stackTraceEvents.set(stackTraceID, count);
  }

  logger.info('total aggregated stacktraces: ' + totalAggregatedStackTraces);
  logger.info('unique aggregated stacktraces: ' + stackTraceEvents.size);

  const { stackTraces, stackFrameDocIDs, executableDocIDs } = await mgetStackTraces({
    logger,
    client,
    events: stackTraceEvents,
  });

  return Promise.all([
    mgetStackFrames({ logger, client, stackFrameIDs: stackFrameDocIDs }),
    mgetExecutables({ logger, client, executableIDs: executableDocIDs }),
  ]).then(([stackFrames, executables]) => {
    const metadata = fromMapToRecord(
      groupStackFrameMetadataByStackTrace(stackTraces, stackFrames, executables)
    );
    return response.ok({
      body: {
        TopN: topN,
        Metadata: metadata,
      },
    });
  });
}

export function queryTopNCommon(
  router: IRouter<ProfilingRequestHandlerContext>,
  logger: Logger,
  pathName: string,
  searchField: string
) {
  router.get(
    {
      path: pathName,
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
      const client = await getClient(context);

      try {
        return await topNElasticSearchQuery({
          client: createProfilingEsClient({ request, esClient: client }),
          logger,
          timeFrom,
          timeTo,
          searchField,
          response,
          kuery,
        });
      } catch (e) {
        return response.customError({
          statusCode: e.statusCode ?? 500,
          body: {
            message: 'Profiling TopN request failed: ' + e.message + '; full error ' + e.toString(),
          },
        });
      }
    }
  );
}

export function registerTraceEventsTopNContainersSearchRoute({
  router,
  logger,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  return queryTopNCommon(
    router,
    logger,
    paths.TopNContainers,
    getFieldNameForTopNType(TopNType.Containers)
  );
}

export function registerTraceEventsTopNDeploymentsSearchRoute({
  router,
  logger,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  return queryTopNCommon(
    router,
    logger,
    paths.TopNDeployments,
    getFieldNameForTopNType(TopNType.Deployments)
  );
}

export function registerTraceEventsTopNHostsSearchRoute({
  router,
  logger,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNHosts, getFieldNameForTopNType(TopNType.Hosts));
}

export function registerTraceEventsTopNStackTracesSearchRoute({
  router,
  logger,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  return queryTopNCommon(
    router,
    logger,
    paths.TopNTraces,
    getFieldNameForTopNType(TopNType.Traces)
  );
}

export function registerTraceEventsTopNThreadsSearchRoute({
  router,
  logger,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  return queryTopNCommon(
    router,
    logger,
    paths.TopNThreads,
    getFieldNameForTopNType(TopNType.Threads)
  );
}

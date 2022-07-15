/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { fromMapToRecord, getRoutePaths } from '../../common';
import { groupStackFrameMetadataByStackTrace, StackTraceID } from '../../common/profiling';
import { createTopNSamples, TopNSamplesHistogramResponse } from '../../common/topn';
import { findDownsampledIndex } from './downsampling';
import { logExecutionLatency } from './logger';
import { autoHistogramSumCountOnGroupByField, createCommonFilter } from './query';
import { mgetExecutables, mgetStackFrames, mgetStackTraces } from './stacktrace';
import { getClient, getAggs } from './compat';
import { ProfilingRequestHandlerContext } from '../types';
import { RouteRegisterParameters } from '.';
import { getFieldNameForTopNType, TopNType } from '../../common/stack_traces';

export async function topNElasticSearchQuery({
  client,
  logger,
  index,
  projectID,
  timeFrom,
  timeTo,
  n,
  searchField,
  response,
  kuery,
}: {
  client: ElasticsearchClient;
  logger: Logger;
  index: string;
  projectID: string;
  timeFrom: string;
  timeTo: string;
  n: number;
  searchField: string;
  response: KibanaResponseFactory;
  kuery: string;
}) {
  const filter = createCommonFilter({ projectID, timeFrom, timeTo, kuery });
  const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

  const eventsIndex = await logExecutionLatency(
    logger,
    'query to find downsampled index',
    async () => {
      return await findDownsampledIndex(logger, client, index, filter, targetSampleSize);
    }
  );

  const resEvents = await logExecutionLatency(
    logger,
    'query to fetch events from ' + eventsIndex.name,
    async () => {
      return await client.search(
        {
          index: eventsIndex.name,
          size: 0,
          query: filter,
          aggs: {
            histogram: autoHistogramSumCountOnGroupByField(searchField, n),
          },
        },
        {
          // Adrien and Dario found out this is a work-around for some bug in 8.1.
          // It reduces the query time by avoiding unneeded searches.
          querystring: {
            pre_filter_shard_size: 1,
          },
        }
      );
    }
  );

  const histogram = getAggs(resEvents)?.histogram as unknown as
    | TopNSamplesHistogramResponse
    | undefined;
  const topN = createTopNSamples(histogram);

  if (searchField !== 'StackTraceID') {
    return response.ok({
      body: { TopN: topN },
    });
  }

  let totalDocCount = 0;
  let totalCount = 0;
  const stackTraceEvents = new Map<StackTraceID, number>();

  const histogramBuckets = histogram?.buckets ?? [];
  for (let i = 0; i < histogramBuckets.length; i++) {
    totalDocCount += histogramBuckets[i].doc_count;
    histogramBuckets[i].group_by.buckets.forEach((stackTraceItem) => {
      const count = stackTraceItem.count.value;
      const oldCount = stackTraceEvents.get(stackTraceItem.key);
      totalCount += count + (oldCount ?? 0);
      stackTraceEvents.set(stackTraceItem.key, count + (oldCount ?? 0));
    });
  }

  logger.info('events total count: ' + totalCount + ' (' + totalDocCount + ' docs)');
  logger.info('unique stacktraces: ' + stackTraceEvents.size);

  const { stackTraces, stackFrameDocIDs, executableDocIDs } = await mgetStackTraces(
    logger,
    client,
    stackTraceEvents
  );

  return Promise.all([
    mgetStackFrames(logger, client, stackFrameDocIDs),
    mgetExecutables(logger, client, executableDocIDs),
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
          index: schema.string(),
          projectID: schema.string(),
          timeFrom: schema.string(),
          timeTo: schema.string(),
          n: schema.number(),
          kuery: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { index, projectID, timeFrom, timeTo, n, kuery } = request.query;
      const client = await getClient(context);

      try {
        return await topNElasticSearchQuery({
          client,
          logger,
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
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

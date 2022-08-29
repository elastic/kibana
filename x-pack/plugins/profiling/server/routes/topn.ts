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
import { ProfilingESField } from '../../common/elasticsearch';
import { groupStackFrameMetadataByStackTrace, StackTraceID } from '../../common/profiling';
import { getFieldNameForTopNType, TopNType } from '../../common/stack_traces';
import { createTopNSamples, getTopNAggregationRequest } from '../../common/topn';
import { ProfilingRequestHandlerContext } from '../types';
import { createProfilingEsClient, ProfilingESClient } from '../utils/create_profiling_es_client';
import { withProfilingSpan } from '../utils/with_profiling_span';
import { getClient } from './compat';
import { findDownsampledIndex } from './downsampling';
import { createCommonFilter, findFixedIntervalForBucketsPerTimeRange } from './query';
import { mgetExecutables, mgetStackFrames, mgetStackTraces } from './stacktrace';

export async function topNElasticSearchQuery({
  client,
  logger,
  timeFrom,
  timeTo,
  searchField,
  highCardinality,
  response,
  kuery,
}: {
  client: ProfilingESClient;
  logger: Logger;
  timeFrom: number;
  timeTo: number;
  searchField: string;
  highCardinality: boolean;
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

  const resEvents = await client.search('get_topn_histogram', {
    index: eventsIndex.name,
    size: 0,
    query: filter,
    aggs: getTopNAggregationRequest({
      searchField,
      highCardinality,
      fixedInterval,
    }),
    // Adrien and Dario found out this is a work-around for some bug in 8.1.
    // It reduces the query time by avoiding unneeded searches.
    pre_filter_shard_size: 1,
  });

  const { aggregations } = resEvents;

  if (!aggregations) {
    return response.ok({
      body: {
        TotalCount: 0,
        TopN: [],
        Metadata: {},
      },
    });
  }

  const topN = createTopNSamples(aggregations);

  const totalSampledStackTraces = aggregations.total_count.value ?? 0;

  logger.info('total sampled stacktraces: ' + totalSampledStackTraces);

  if (searchField !== ProfilingESField.StacktraceID) {
    return response.ok({
      body: { TotalCount: totalSampledStackTraces, TopN: topN, Metadata: {} },
    });
  }

  const stackTraceEvents = new Map<StackTraceID, number>();
  const groupByBuckets = aggregations.group_by.buckets ?? [];
  let totalAggregatedStackTraces = 0;

  for (let i = 0; i < groupByBuckets.length; i++) {
    const stackTraceID = String(groupByBuckets[i].key);
    const count = groupByBuckets[i].count.value ?? 0;
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

  const [stackFrames, executables] = await withProfilingSpan(
    'get_stackframes_and_executables',
    () => {
      return Promise.all([
        mgetStackFrames({ logger, client, stackFrameIDs: stackFrameDocIDs }),
        mgetExecutables({ logger, client, executableIDs: executableDocIDs }),
      ]);
    }
  );

  const metadata = await withProfilingSpan('collect_stackframe_metadata', async () => {
    return fromMapToRecord(
      groupStackFrameMetadataByStackTrace(stackTraces, stackFrames, executables)
    );
  });

  logger.info('returning payload response to client');

  return response.ok({
    body: {
      TotalCount: totalSampledStackTraces,
      TopN: topN,
      Metadata: metadata,
    },
  });
}

export function queryTopNCommon(
  router: IRouter<ProfilingRequestHandlerContext>,
  logger: Logger,
  pathName: string,
  searchField: string,
  highCardinality: boolean
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
          highCardinality,
          response,
          kuery,
        });
      } catch (e) {
        logger.error(e);

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
    getFieldNameForTopNType(TopNType.Containers),
    false
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
    getFieldNameForTopNType(TopNType.Deployments),
    false
  );
}

export function registerTraceEventsTopNHostsSearchRoute({
  router,
  logger,
}: RouteRegisterParameters) {
  const paths = getRoutePaths();
  return queryTopNCommon(
    router,
    logger,
    paths.TopNHosts,
    getFieldNameForTopNType(TopNType.Hosts),
    false
  );
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
    getFieldNameForTopNType(TopNType.Traces),
    false
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
    getFieldNameForTopNType(TopNType.Threads),
    true
  );
}

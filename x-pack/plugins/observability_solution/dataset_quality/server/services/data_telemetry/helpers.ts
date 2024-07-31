/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of, Observable, concatMap, delay, map, toArray } from 'rxjs';
import { InfoResponse, MappingPropertyBase } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IndexName } from '@kbn/ml-data-frame-analytics-utils/src/types';

import {
  DataStreamBasicInfo,
  DataStreamStatsByNamespace,
  DataStreamStats,
  DataTelemetryEvent,
} from './types';

/**
 * Retrieves unique data streams for all streams of logs.
 * Excludes streams for known signals other than logs e.g. alerts, metrics etc as well log streams which are not
 * relevant for data telemetry.
 */
export function getDataStreamsInfoForStreamOfLogs({
  esClient,
  streamOfLogs,
  excludeStreamsStartingWith,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  streamOfLogs: string[];
  excludeStreamsStartingWith: string[];
  breatheDelay: number; // Breathing time between each request to prioritize other cluster operations
}): Observable<DataStreamBasicInfo[]> {
  const uniqueDataStreamsSet = new Set<string>();
  const dataStreamsInfo: DataStreamBasicInfo[] = [];

  return from(streamOfLogs).pipe(
    concatMap((streamOfLog) =>
      of(streamOfLog).pipe(
        delay(breatheDelay),
        concatMap(() => from(getDataStreamsInfoForPattern({ esClient, pattern: streamOfLog }))),
        map((dataStreamsForStreamOfLog) => {
          return dataStreamsForStreamOfLog.filter(
            // Exclude streams starting with known signals
            (dataStream) =>
              !excludeStreamsStartingWith.some((excludeStream) =>
                dataStream.name.startsWith(excludeStream)
              )
          );
        }),
        map((logDataStreams) =>
          logDataStreams.filter((dataStream) => {
            if (uniqueDataStreamsSet.has(dataStream.name)) {
              return false;
            }
            uniqueDataStreamsSet.add(dataStream.name);
            return true;
          })
        ),
        map((dataStreamsInfoRecords) => {
          dataStreamsInfo.push(...dataStreamsInfoRecords);
          return dataStreamsInfoRecords;
        })
      )
    ),
    toArray(),
    map(() => dataStreamsInfo)
  );
}

export function addMappingsToDataStreams({
  esClient,
  dataStreamsInfo,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  dataStreamsInfo: DataStreamBasicInfo[];
  breatheDelay: number;
}): Observable<DataStreamBasicInfo[]> {
  return from(dataStreamsInfo).pipe(
    delay(breatheDelay),
    concatMap((info) =>
      of(info).pipe(
        concatMap(() =>
          getDataStreamIndexMappings({
            esClient,
            indexName: info.name,
            latestIndex: info.latestIndex,
          })
        ),
        map((mapping) => {
          info.mapping = mapping;
          return info;
        })
      )
    ),
    toArray()
  );
}

export function addStreamNameAndNamespace({
  dataStreamsInfo,
  breatheDelay,
}: {
  dataStreamsInfo: DataStreamBasicInfo[];
  breatheDelay: number;
}): Observable<DataStreamBasicInfo[]> {
  return from(dataStreamsInfo).pipe(
    delay(breatheDelay),
    concatMap((info) =>
      of(info).pipe(
        map((dataStream) => getStreamNameAndNamespace(dataStream)),
        map(({ namespace, streamName }) => {
          info.namespace = namespace;
          info.streamName = streamName;
          return info;
        })
      )
    ),
    toArray()
  );
}

export function groupStatsByStreamName(dataStreamsStats: DataStreamStatsByNamespace[]) {
  const statsByStream = dataStreamsStats.reduce<Map<string, DataStreamStats>>((acc, stats) => {
    if (!stats.streamName) {
      return acc;
    }

    if (!acc.get(stats.streamName)) {
      acc.set(stats.streamName, {
        streamName: stats.streamName,
        totalNamespaces: 0,
        totalDocuments: 0,
        totalSize: 0,
        totalIndices: 0,
      });
    }

    const streamStats = acc.get(stats.streamName)!;
    streamStats.totalNamespaces += stats.namespace ? 1 : 0;
    streamStats.totalDocuments += stats.totalDocuments;
    streamStats.totalSize += stats.totalSize;
    streamStats.totalIndices += stats.totalIndices;

    return acc;
  }, new Map());

  return Array.from(statsByStream.values());
}

export function addDataStreamBasicStats({
  esClient,
  streams,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  streams: DataStreamBasicInfo[];
  breatheDelay: number;
}) {
  return from(streams).pipe(
    delay(breatheDelay),
    concatMap((info) => from(getDataStreamStats(esClient, info))),
    toArray()
  );
}

async function getDataStreamsInfoForPattern({
  esClient,
  pattern,
}: {
  esClient: ElasticsearchClient;
  pattern: string;
}) {
  const resp = await esClient.indices.getDataStream({
    name: pattern,
  });

  return resp.data_streams.map((dataStream) => ({
    name: dataStream.name,
    latestIndex: dataStream.indices.length
      ? dataStream.indices[dataStream.indices.length - 1].index_name
      : undefined,
    meta: dataStream._meta,
  }));
}

async function getDataStreamIndexMappings({
  esClient,
  indexName,
  latestIndex,
}: {
  esClient: ElasticsearchClient;
  indexName: IndexName;
  latestIndex?: string;
}) {
  const resp = await esClient.indices.getMapping({
    index: latestIndex ?? indexName,
  });

  return Object.values(resp)?.[0];
}

/**
 * Determines the stream name as well as the namespace of a dataStream.
 *
 * Note that determining the namespace in the data stream name is not reliable due to the fact that the namespace
 * could contain hyphens. Thus it first looks into the mapping and if it is not found, it considers the last part of the
 * dataStream name as the namespace.
 */
function getStreamNameAndNamespace(dataStreamInfo: DataStreamBasicInfo) {
  const dataStreamMapping: MappingPropertyBase | undefined =
    dataStreamInfo?.mapping?.mappings?.properties?.data_stream;

  const namespaceInMapping = (dataStreamMapping?.properties?.namespace as { value?: string })
    ?.value;

  // Consider the namespace as the last part of the dataStream name
  const nameParts = dataStreamInfo.name.split('-');
  const namespaceInName = nameParts.pop();

  const namespace = namespaceInMapping ?? namespaceInName;
  const streamName = namespace
    ? dataStreamInfo.name.replace(`-${namespace}`, '')
    : nameParts.join('-');

  return {
    namespace,
    streamName,
  };
}

export async function getDataStreamStats(
  esClient: ElasticsearchClient,
  info: DataStreamBasicInfo
): Promise<DataStreamStatsByNamespace> {
  const resp = await esClient.indices.stats({
    index: info.name,
  });

  const totalDocs = resp._all.primaries?.docs?.count;
  const totalSize = resp._all.primaries?.store?.size_in_bytes;
  const totalIndices = Object.keys(resp.indices ?? []).length;

  return {
    streamName: info.streamName ?? '',
    namespace: info.namespace ?? '',
    totalDocuments: totalDocs ?? 0,
    totalSize: totalSize ?? 0,
    totalIndices,
  };
}

export function streamStatsToTelemetryEvents(
  stats: DataStreamStats[],
  clusterInfo?: InfoResponse
): DataTelemetryEvent[] {
  return stats.map((stat) => ({
    '@timestamp': new Date().toISOString(),
    'cluster-uuid': clusterInfo?.cluster_uuid ?? '',
    stream_name: stat.streamName,
    number_of_documents: stat.totalDocuments,
    number_of_indices: stat.totalIndices,
    number_of_namespaces: stat.totalNamespaces,
    size_in_bytes: stat.totalSize,
  }));
}

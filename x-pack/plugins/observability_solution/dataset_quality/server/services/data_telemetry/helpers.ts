/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of, Observable, concatMap, delay, map, toArray, forkJoin } from 'rxjs';
import { MappingTypeMapping, MappingPropertyBase } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DatasetIndexPattern } from './types';

import {
  IndexBasicInfo,
  DataStreamStatsByNamespace,
  DataStreamStats,
  DataTelemetryEvent,
} from './types';

/**
 * Retrieves all indices and data streams for each stream of logs.
 */
export function getAllIndices({
  esClient,
  logsIndexPatterns,
  excludeStreamsStartingWith,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  logsIndexPatterns: DatasetIndexPattern[];
  excludeStreamsStartingWith: string[];
  breatheDelay: number; // Breathing time between each request to prioritize other cluster operations
}): Observable<IndexBasicInfo[]> {
  const uniqueIndices = new Set<string>();
  const indicesInfo: IndexBasicInfo[] = [];

  return from(logsIndexPatterns).pipe(
    concatMap((pattern) =>
      of(pattern).pipe(
        delay(breatheDelay),
        concatMap(() => {
          return forkJoin([
            from(getDataStreamsInfoForPattern({ esClient, pattern })),
            from(getIndicesInfoForPattern({ esClient, pattern })),
          ]);
        }),
        map(([patternDataStreamsInfo, patternIndicesInfo]) => {
          return [...patternDataStreamsInfo, ...patternIndicesInfo];
        }),
        map((indicesAndDataStreams) => {
          // Exclude indices that have already been dealt with
          return indicesAndDataStreams.filter((dataStream) => {
            return !uniqueIndices.has(dataStream.name);
          });
        }),
        map((indicesAndDataStreams) => {
          // Exclude internal indices
          return indicesAndDataStreams.filter((dataStream) => !dataStream.name.startsWith('.'));
        }),
        map((indicesAndDataStreams) => {
          return indicesAndDataStreams.filter(
            // Exclude streams starting with known signals
            (dataStream) =>
              !excludeStreamsStartingWith.some((excludeStream) =>
                dataStream.name.startsWith(excludeStream)
              )
          );
        }),
        map((indicesAndDataStreams) => {
          indicesAndDataStreams.forEach((dataStream) => {
            uniqueIndices.add(dataStream.name);
          });
          return indicesAndDataStreams;
        }),
        map((dataStreamsInfoRecords) => {
          indicesInfo.push(...dataStreamsInfoRecords);
          return dataStreamsInfoRecords;
        })
      )
    ),
    toArray(),
    map(() => indicesInfo)
  );
}

/**
 * Retrieves and adds the mapping of the index if it is not already present.
 */
export function addMappingsToIndices({
  esClient,
  dataStreamsInfo,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  dataStreamsInfo: IndexBasicInfo[];
  breatheDelay: number;
}): Observable<IndexBasicInfo[]> {
  return from(dataStreamsInfo).pipe(
    delay(breatheDelay),
    concatMap((info) =>
      info.mapping
        ? of(info)
        : of(info).pipe(
            concatMap(() =>
              getIndexMapping({
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

/**
 * Adds the namespace of the index from index mapping if available.
 */
export function addNamespace({
  dataStreamsInfo,
  breatheDelay,
}: {
  dataStreamsInfo: IndexBasicInfo[];
  breatheDelay: number;
}): Observable<IndexBasicInfo[]> {
  return from(dataStreamsInfo).pipe(
    delay(breatheDelay),
    concatMap((indexInfo) =>
      of(indexInfo).pipe(
        map((dataStream) => getIndexNamespace(dataStream)),
        map((namespace) => {
          indexInfo.namespace = namespace;
          return indexInfo;
        })
      )
    ),
    toArray()
  );
}

export function groupStatsByPatternName(dataStreamsStats: DataStreamStatsByNamespace[]) {
  const uniqueNamespaces = new Set<string>();
  const statsByStream = dataStreamsStats.reduce<Map<string, DataStreamStats>>((acc, stats) => {
    if (!stats.patternName) {
      return acc;
    }

    if (!acc.get(stats.patternName)) {
      acc.set(stats.patternName, {
        streamName: stats.patternName,
        totalNamespaces: 0,
        totalDocuments: 0,
        failureStoreDocuments: 0,
        failureStoreIndices: 0,
        totalSize: 0,
        totalIndices: 0,
        managedBy: [],
        packageName: [],
        beat: [],
      });
    }

    const streamStats = acc.get(stats.patternName)!;

    if (stats.namespace) {
      uniqueNamespaces.add(stats.namespace);
    }
    streamStats.totalNamespaces = uniqueNamespaces.size;

    streamStats.totalDocuments += stats.totalDocuments;
    streamStats.totalIndices += stats.totalIndices;
    streamStats.failureStoreDocuments += stats.failureStoreDocuments;
    streamStats.failureStoreIndices += stats.failureStoreIndices;
    streamStats.totalSize += stats.totalSize;

    if (stats.meta?.managed_by) {
      streamStats.managedBy.push(stats.meta.managed_by);
    }

    if (stats.meta?.package?.name) {
      streamStats.packageName.push(stats.meta.package.name);
    }

    if (stats.meta?.beat) {
      streamStats.beat.push(stats.meta.beat);
    }

    return acc;
  }, new Map());

  return Array.from(statsByStream.values());
}

export function getIndexBasicStats({
  esClient,
  indices,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  indices: IndexBasicInfo[];
  breatheDelay: number;
}) {
  return from(indices).pipe(
    delay(breatheDelay),
    concatMap((info) => from(getIndexStats(esClient, info))),
    toArray()
  );
}

export function indexStatsToTelemetryEvents(stats: DataStreamStats[]): DataTelemetryEvent[] {
  return stats.map((stat) => ({
    pattern_name: stat.streamName,
    doc_count: stat.totalDocuments,
    index_count: stat.totalIndices,
    failure_store_doc_count: stat.failureStoreDocuments,
    failure_store_index_count: stat.failureStoreIndices,
    namespace_count: stat.totalNamespaces,
    size_in_bytes: stat.totalSize,
    managed_by: Array.from(new Set(stat.managedBy)),
    package_name: Array.from(new Set(stat.packageName)),
    beat: Array.from(new Set(stat.beat)),
  }));
}

/**
 * Retrieves information about data streams matching a given pattern.
 */
async function getDataStreamsInfoForPattern({
  esClient,
  pattern,
}: {
  esClient: ElasticsearchClient;
  pattern: DatasetIndexPattern;
}): Promise<IndexBasicInfo[]> {
  const resp = await esClient.indices.getDataStream({
    name: pattern.pattern,
    expand_wildcards: 'all',
  });

  return resp.data_streams.map((dataStream) => ({
    patternName: pattern.patternName,
    isDataStream: true,
    name: dataStream.name,
    latestIndex: dataStream.indices.length
      ? dataStream.indices[dataStream.indices.length - 1].index_name
      : undefined,
    mapping: undefined,
    meta: dataStream._meta,
  }));
}

async function getIndicesInfoForPattern({
  esClient,
  pattern,
}: {
  esClient: ElasticsearchClient;
  pattern: DatasetIndexPattern;
}): Promise<IndexBasicInfo[]> {
  const resp = await esClient.indices.get({
    index: pattern.pattern,
  });

  return Object.entries(resp).map(([index, indexInfo]) => ({
    patternName: pattern.patternName,
    isDataStream: false,
    name: index,
    latestIndex: index,
    mapping: indexInfo.mappings,
    meta: indexInfo.mappings?._meta,
  }));
}

async function getIndexMapping({
  esClient,
  indexName,
  latestIndex,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  latestIndex?: string;
}): Promise<MappingTypeMapping> {
  const resp = await esClient.indices.getMapping({
    index: latestIndex ?? indexName,
  });

  return resp[latestIndex ?? indexName].mappings;
}

/**
 * Retrieves the namespace of index.
 *
 * @param {Object} indexInfo - The information about the index.
 * @returns {string} - The namespace of the data stream found in the mapping.
 */
function getIndexNamespace(indexInfo: IndexBasicInfo) {
  const dataStreamMapping: MappingPropertyBase | undefined =
    indexInfo?.mapping?.properties?.data_stream;

  return (dataStreamMapping?.properties?.namespace as { value?: string })?.value;
}

export async function getIndexStats(
  esClient: ElasticsearchClient,
  info: IndexBasicInfo
): Promise<DataStreamStatsByNamespace> {
  const resp = await esClient.indices.stats({
    index: info.name,
  });

  const failureStoreStats = info.isDataStream
    ? await getFailureStoreStats({ esClient, indexName: info.name })
    : { docCount: 0, indexCount: 0 };

  const totalDocs = resp._all.primaries?.docs?.count;
  const totalSize = resp._all.primaries?.store?.size_in_bytes;
  const totalIndices = Object.keys(resp.indices ?? []).length;

  return {
    patternName: info.patternName,
    namespace: info.namespace ?? '',
    totalDocuments: totalDocs ?? 0,
    totalSize: totalSize ?? 0,
    totalIndices,
    failureStoreDocuments: failureStoreStats.docCount,
    failureStoreIndices: failureStoreStats.indexCount,
    meta: info.meta,
  };
}

async function getFailureStoreStats({
  esClient,
  indexName,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
}): Promise<{ docCount: number; indexCount: number }> {
  try {
    // TODO: Use the failure store API when it is available
    const resp = await esClient.transport.request<ReturnType<typeof esClient.indices.stats>>({
      method: 'GET',
      path: `/${indexName}/_stats`,
      querystring: {
        failure_store: 'only',
      },
    });

    const docCount = resp._all.primaries?.docs?.count ?? 0;
    const indexCount = Object.keys(resp.indices ?? []).length;

    return { docCount, indexCount };
  } catch (e) {
    // Failure store API may not be available
    return { docCount: 0, indexCount: 0 };
  }
}

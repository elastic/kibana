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
  const statsByStream = dataStreamsStats.reduce<Map<string, DataStreamStats>>((acc, stats) => {
    if (!stats.patternName) {
      return acc;
    }

    if (!acc.get(stats.patternName)) {
      acc.set(stats.patternName, {
        streamName: stats.patternName,
        totalNamespaces: 0,
        totalDocuments: 0,
        totalSize: 0,
        totalIndices: 0,
      });
    }

    const streamStats = acc.get(stats.patternName)!;
    streamStats.totalNamespaces += stats.namespace ? 1 : 0;
    streamStats.totalDocuments += stats.totalDocuments;
    streamStats.totalSize += stats.totalSize;
    streamStats.totalIndices += stats.totalIndices;

    return acc;
  }, new Map());

  return Array.from(statsByStream.values());
}

export function addIndexBasicStats({
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

/**
 * Retrieves information about data streams matching a given pattern.
 * @param {Object} options - The options for retrieving data stream information.
 * @param {ElasticsearchClient} options.esClient - The Elasticsearch client.
 * @param {string} options.pattern - The pattern to match data streams.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of data stream information.
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

  const totalDocs = resp._all.primaries?.docs?.count;
  const totalSize = resp._all.primaries?.store?.size_in_bytes;
  const totalIndices = Object.keys(resp.indices ?? []).length;

  return {
    patternName: info.patternName,
    namespace: info.namespace ?? '',
    totalDocuments: totalDocs ?? 0,
    totalSize: totalSize ?? 0,
    totalIndices,
  };
}

export function indexStatsToTelemetryEvents(stats: DataStreamStats[]): DataTelemetryEvent[] {
  return stats.map((stat) => ({
    pattern_name: stat.streamName,
    number_of_documents: stat.totalDocuments,
    number_of_indices: stat.totalIndices,
    number_of_namespaces: stat.totalNamespaces,
    size_in_bytes: stat.totalSize,
  }));
}

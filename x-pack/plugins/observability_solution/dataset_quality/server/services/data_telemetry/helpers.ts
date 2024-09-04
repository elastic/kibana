/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of, Observable, concatMap, delay, map, toArray, forkJoin } from 'rxjs';
import {
  MappingPropertyBase,
  IndicesGetMappingResponse,
  IndicesStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { DataStreamFieldStatsPerNamespace, DatasetIndexPattern } from './types';

import {
  IndexBasicInfo,
  DataStreamStatsPerNamespace,
  DataStreamStats,
  DataTelemetryEvent,
} from './types';
import { DATA_TELEMETRY_FIELDS } from './constants';

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
 * Retrieves the mappings at once and adds to the indices info.
 */
export function addMappingsToIndices({
  esClient,
  dataStreamsInfo,
  logsIndexPatterns,
  breatheDelay,
}: {
  esClient: ElasticsearchClient;
  dataStreamsInfo: IndexBasicInfo[];
  logsIndexPatterns: DatasetIndexPattern[];
  breatheDelay: number;
}): Observable<IndexBasicInfo[]> {
  return from(
    esClient.indices.getMapping({
      index: logsIndexPatterns.map((pattern) => pattern.pattern),
    })
  ).pipe(
    delay(breatheDelay),
    map((mappings) => {
      return dataStreamsInfo.map((info) => {
        const indexMapping = mappings[info.latestIndex ?? info.name];
        if (indexMapping) {
          info.mapping = { [info.latestIndex ?? info.name]: indexMapping };
        }
        return info;
      });
    })
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

export function groupStatsByPatternName(dataStreamsStats: DataStreamFieldStatsPerNamespace[]) {
  const uniqueNamespaces = new Set<string>();
  const uniqueFields = new Set<string>();
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
        totalFields: 0,
        fieldsCount: {},
        managedBy: [],
        packageName: [],
        beat: [],
      });
    }

    const streamStats = acc.get(stats.patternName)!;

    // Track unique namespaces
    if (stats.namespace) {
      uniqueNamespaces.add(stats.namespace);
    }
    streamStats.totalNamespaces = uniqueNamespaces.size;

    // Track unique fields
    stats.uniqueFields.forEach((field) => uniqueFields.add(field));
    streamStats.totalFields = uniqueFields.size;

    streamStats.totalDocuments += stats.totalDocuments;
    streamStats.totalIndices += stats.totalIndices;
    streamStats.failureStoreDocuments += stats.failureStoreDocuments;
    streamStats.failureStoreIndices += stats.failureStoreIndices;
    streamStats.totalSize += stats.totalSize;

    for (const [field, count] of Object.entries(stats.fieldsCount)) {
      streamStats.fieldsCount[field] = (streamStats.fieldsCount[field] ?? 0) + count;
    }

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
}): Observable<DataStreamStatsPerNamespace[]> {
  const indexNames = indices.map((info) => info.name);

  return from(
    esClient.indices.stats({
      index: indexNames,
    })
  ).pipe(
    concatMap((allIndexStats) => {
      return from(getFailureStoreStats({ esClient, indexName: indexNames.join(',') })).pipe(
        delay(breatheDelay),
        map((allFailureStoreStats) => {
          return indices.map((info) =>
            getIndexStats(allIndexStats.indices, allFailureStoreStats, info)
          );
        })
      );
    })
  );
}

export function getIndexFieldStats({
  basicStats,
  breatheDelay,
}: {
  basicStats: DataStreamStatsPerNamespace[];
  breatheDelay: number;
}): Observable<DataStreamFieldStatsPerNamespace[]> {
  return from(basicStats).pipe(
    delay(breatheDelay),
    map((stats) => getFieldStats(stats, DATA_TELEMETRY_FIELDS)),
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
    field_count: stat.totalFields,
    field_existence: stat.fieldsCount,
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

  return Object.entries(resp).map(([index, indexInfo]) => {
    // This is needed to keep the format same for data streams and indices
    const indexMapping: IndicesGetMappingResponse | undefined = indexInfo.mappings
      ? {
          [index]: { mappings: indexInfo.mappings },
        }
      : undefined;

    return {
      patternName: pattern.patternName,
      isDataStream: false,
      name: index,
      latestIndex: index,
      mapping: indexMapping,
      meta: indexInfo.mappings?._meta,
    };
  });
}

/**
 * Retrieves the namespace of index.
 *
 * @param {Object} indexInfo - The information about the index.
 * @returns {string} - The namespace of the data stream found in the mapping.
 */
function getIndexNamespace(indexInfo: IndexBasicInfo) {
  const indexMapping = indexInfo.mapping?.[indexInfo.latestIndex ?? indexInfo.name]?.mappings;
  const dataStreamMapping: MappingPropertyBase | undefined = indexMapping?.properties?.data_stream;

  return (dataStreamMapping?.properties?.namespace as { value?: string })?.value;
}

async function getFailureStoreStats({
  esClient,
  indexName,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
}): Promise<IndicesStatsResponse['indices']> {
  try {
    // TODO: Use the failure store API when it is available
    const resp = await esClient.transport.request<ReturnType<typeof esClient.indices.stats>>({
      method: 'GET',
      path: `/${indexName}/_stats`,
      querystring: {
        failure_store: 'only',
      },
    });

    return (await resp).indices;
  } catch (e) {
    // Failure store API may not be available
    return {};
  }
}

export function getIndexStats(
  allIndexStats: IndicesStatsResponse['indices'],
  allFailureStoreStats: IndicesStatsResponse['indices'],
  info: IndexBasicInfo
): DataStreamStatsPerNamespace {
  let totalDocs = 0;
  let totalSize = 0;
  let totalIndices = 0;
  const indexStats: IndicesStatsResponse['indices'] = {};
  let failureStoreDocs = 0;
  let failureStoreIndices = 0;
  const failureStoreStats: IndicesStatsResponse['indices'] = {};
  Object.entries(allIndexStats ?? {}).forEach(([indexName, stats]) => {
    if (indexName.includes(info.name)) {
      totalDocs += stats.primaries?.docs?.count ?? 0;
      totalSize += stats.primaries?.store?.size_in_bytes ?? 0;
      totalIndices++;

      indexStats[indexName] = stats;
    }
  });

  Object.entries(allFailureStoreStats ?? {}).forEach(([indexName, stats]) => {
    if (indexName.includes(info.name)) {
      failureStoreDocs += stats.primaries?.docs?.count ?? 0;
      failureStoreIndices++;

      failureStoreStats[indexName] = stats;
    }
  });

  return {
    patternName: info.patternName,
    namespace: info.namespace,
    totalDocuments: totalDocs,
    totalSize,
    totalIndices,
    failureStoreDocuments: failureStoreDocs,
    failureStoreIndices,
    meta: info.meta,
    mapping: info.mapping,
    indexStats,
    failureStoreStats,
  };
}

function getFieldStats(
  stats: DataStreamStatsPerNamespace,
  fieldsToCheck: string[]
): DataStreamFieldStatsPerNamespace {
  const uniqueFields = new Set<string>();

  // Loop through each index and get the number of fields and gather how many documents have that field
  const resourceFieldCounts: Record<string, number> = {};
  const indexNames = Object.keys(stats.indexStats ?? {});
  for (const backingIndex of indexNames) {
    const indexStats = stats.indexStats?.[backingIndex];
    const indexMapping = stats.mapping?.[backingIndex]?.mappings;
    if (!indexMapping) {
      continue;
    }

    // Get all fields from the mapping
    const indexFields = getFieldsListFromMapping(indexMapping);
    indexFields.forEach((field) => uniqueFields.add(field));

    if (!indexStats?.primaries?.docs?.count) {
      continue;
    }

    for (const field of fieldsToCheck) {
      if (doesFieldExistInMapping(field, indexMapping)) {
        resourceFieldCounts[field] =
          (resourceFieldCounts[field] ?? 0) + indexStats?.primaries?.docs?.count ?? 0;
      }
    }
  }

  return {
    ...stats,
    uniqueFields: Array.from(uniqueFields),
    fieldsCount: resourceFieldCounts,
  };
}

function getFieldsListFromMapping(mapping: MappingPropertyBase): string[] {
  const fields: string[] = [];

  for (const [fieldName, field] of Object.entries(mapping.properties ?? {})) {
    if ((field as MappingPropertyBase).properties) {
      fields.push(...getFieldsListFromMapping(field).map((subField) => `${fieldName}.${subField}`));
    } else {
      fields.push(fieldName);
    }
  }

  return fields;
}

/**
 * Splits the field path and recursively checks if the field exists in the mapping.
 */
function doesFieldExistInMapping(fieldPath: string, mapping: MappingPropertyBase): boolean {
  const [field, ...rest] = fieldPath.split('.');

  if (!mapping?.properties) {
    return false;
  }

  if (rest.length === 0) {
    return !!mapping.properties[field];
  }

  return doesFieldExistInMapping(rest.join('.'), mapping.properties[field]);
}

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
}) {
  return from(indices).pipe(
    delay(breatheDelay),
    concatMap((info) => from(getIndexStats(esClient, info))),
    toArray()
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

async function getIndexMapping({
  esClient,
  indexName,
  latestIndex,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  latestIndex?: string;
}): Promise<IndicesGetMappingResponse> {
  const resp = await esClient.indices.getMapping({
    index: latestIndex ?? indexName,
  });

  return resp;
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

export async function getIndexStats(
  esClient: ElasticsearchClient,
  info: IndexBasicInfo
): Promise<DataStreamStatsPerNamespace> {
  const stats = await esClient.indices.stats({
    index: info.name,
  });

  const failureStoreStats = info.isDataStream
    ? await getFailureStoreStats({ esClient, indexName: info.name })
    : { docCount: 0, indexCount: 0 };

  const totalDocs = stats._all.primaries?.docs?.count;
  const totalSize = stats._all.primaries?.store?.size_in_bytes;
  const totalIndices = Object.keys(stats.indices ?? []).length;

  return {
    patternName: info.patternName,
    namespace: info.namespace,
    totalDocuments: totalDocs ?? 0,
    totalSize: totalSize ?? 0,
    totalIndices,
    failureStoreDocuments: failureStoreStats.docCount,
    failureStoreIndices: failureStoreStats.indexCount,
    meta: info.meta,
    mapping: info.mapping,
    stats,
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

function getFieldStats(
  stats: DataStreamStatsPerNamespace,
  fieldsToCheck: string[]
): DataStreamFieldStatsPerNamespace {
  const uniqueFields = new Set<string>();

  // Loop through each index and get the number of fields and gather how many documents have that field
  const resourceFieldCounts: Record<string, number> = {};
  const indexNames = Object.keys(stats.stats.indices ?? {});
  for (const backingIndex of indexNames) {
    const indexStats = stats.stats.indices?.[backingIndex];
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

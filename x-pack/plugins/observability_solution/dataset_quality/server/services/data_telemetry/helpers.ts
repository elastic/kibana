/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingPropertyBase } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { IndexName } from '@kbn/ml-data-frame-analytics-utils/src/types';
import { DataStreamBasicInfo } from './types';

export async function getDatasetsForStreamOfLogs({
  esClient,
  streamOfLogs,
  excludeStreamsStartingWith,
}: {
  esClient: ElasticsearchClient;
  streamOfLogs: string[];
  excludeStreamsStartingWith: string[];
}) {
  const dataStreamsInfo: DataStreamBasicInfo[] = [];

  for (const streamOfLog of streamOfLogs) {
    const dataStreamsForStreamOfLog = await getDataStreamsInfoForPattern({
      esClient,
      pattern: streamOfLog,
    });

    // Filter out logs which start with EXCLUDE_ELASTIC_LOGS
    const logDataStreams = dataStreamsForStreamOfLog.filter(
      (dataStream) =>
        !excludeStreamsStartingWith.some((excludeStream) =>
          dataStream.name.startsWith(excludeStream)
        )
    );

    const uniqueDataStreamsSet = new Set<string>();
    const dataStreamsInfoRecords: DataStreamBasicInfo[] = logDataStreams.filter((dataStream) => {
      if (uniqueDataStreamsSet.has(dataStream.name)) {
        return false;
      }

      uniqueDataStreamsSet.add(dataStream.name);
      return true;
    });

    dataStreamsInfo.push(...dataStreamsInfoRecords);
  }

  // Get DataStream Mapping and keep the record
  for (const dataStream of dataStreamsInfo) {
    dataStream.mapping = await getDataStreamIndexMappings({
      esClient,
      indexName: dataStream.name,
      latestIndex: dataStream.latestIndex,
    });
  }

  // Determine namespace of each dataStream utilizing mapping
  for (const dataStream of dataStreamsInfo) {
    const { namespace, streamName } = getStreamNameAndNamespace(dataStream);
    dataStream.namespace = namespace;
    dataStream.streamName = streamName;
  }

  // Group dataStreams by stream_name
  const streamsByStreamName = dataStreamsInfo.reduce<Record<string, DataStreamBasicInfo[]>>(
    (acc, dataStream) => {
      if (!dataStream.streamName) {
        return acc;
      }

      if (!acc[dataStream.streamName]) {
        acc[dataStream.streamName] = [];
      }

      acc[dataStream.streamName].push(dataStream);

      return acc;
    },
    {}
  );

  // Calculate the total number of namespaces, documents, indices and size stream
  const results = await Promise.all(
    Object.entries(streamsByStreamName).map(async ([streamName, dataStreams]) => {
      const namespacesSet = new Set<string>();
      const statsSum = { totalDocuments: 0, totalSize: 0, totalIndices: 0 };

      for (const dataStream of dataStreams) {
        namespacesSet.add(dataStream.namespace ?? '');
        const stats = await getDataStreamStats(esClient, dataStream.name);
        statsSum.totalDocuments += stats.totalDocuments;
        statsSum.totalSize += stats.totalSize;
        statsSum.totalIndices += stats.totalIndices;
      }

      return {
        streamName,
        totalNamespaces: namespacesSet.size,
        ...statsSum,
      };
    })
  );

  return results;
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
  const dataStreamMapping: MappingPropertyBase =
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

export async function getDataStreamStats(esClient: ElasticsearchClient, dataStream: string) {
  const resp = await esClient.indices.stats({
    index: dataStream,
  });

  const totalDocs = resp._all.primaries?.docs?.count;
  const totalSize = resp._all.primaries?.store?.size_in_bytes;
  const totalIndices = Object.keys(resp.indices ?? []).length;

  return {
    totalDocuments: totalDocs ?? 0,
    totalSize: totalSize ?? 0,
    totalIndices,
  };
}

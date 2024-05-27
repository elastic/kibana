/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { DataStreamType } from '../../../../common/types';
import { dataStreamService } from '../../../services';
import { indexStatsService } from '../../../services';

export async function getDataStreamsStats({
  esClient,
  type,
  datasetQuery,
  sizeStatsAvailable = true,
}: {
  esClient: ElasticsearchClient;
  type?: DataStreamType;
  datasetQuery?: string;
  sizeStatsAvailable?: boolean; // Only Needed to determine whether `_stats` endpoint is available https://github.com/elastic/kibana/issues/178954
}) {
  const matchingDataStreamsStats = dataStreamService.getMatchingDataStreamsStats(esClient, {
    type: type ?? '*',
    dataset: datasetQuery ? `*${datasetQuery}*` : '*',
  });

  const indicesDocsCount = sizeStatsAvailable
    ? indexStatsService.getIndicesDocCounts(esClient, type ?? '*')
    : Promise.resolve(null);

  const [indicesDocsCountStats, dataStreamsStats] = await Promise.all([
    indicesDocsCount,
    matchingDataStreamsStats,
  ]);

  const mappedDataStreams = dataStreamsStats.map((dataStream) => {
    return {
      name: dataStream.data_stream,
      size: dataStream.store_size?.toString(),
      sizeBytes: dataStream.store_size_bytes,
      lastActivity: dataStream.maximum_timestamp,
      totalDocs: sizeStatsAvailable
        ? indicesDocsCountStats!.docsCountPerDataStream[dataStream.data_stream] || 0
        : null,
    };
  });

  return {
    items: mappedDataStreams,
  };
}

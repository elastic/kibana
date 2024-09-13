/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { dataStreamService } from '../../../services';
import { indexStatsService } from '../../../services';

export async function getDataStreamsStats({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}): Promise<Record<string, { size: string; sizeBytes: number; totalDocs: number }>> {
  if (!dataStreams.length) {
    return Promise.resolve({});
  }

  const matchingDataStreamsStats = dataStreamService.getStreamsStats(esClient, dataStreams);
  const indicesDocsCount = indexStatsService.getIndicesDocCounts(esClient, dataStreams);

  const [indicesDocsCountStats, dataStreamsStats] = await Promise.all([
    indicesDocsCount,
    matchingDataStreamsStats,
  ]);

  return dataStreamsStats.reduce(
    (acc, dataStream) => ({
      ...acc,
      [dataStream.data_stream]: {
        size: dataStream.store_size!.toString(),
        sizeBytes: dataStream.store_size_bytes,
        totalDocs: indicesDocsCountStats!.docsCountPerDataStream[dataStream.data_stream],
      },
    }),
    {}
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { reduceAsyncChunks } from '../../../utils/reduce_async_chunks';

export interface MeteringStatsResponse {
  datastreams: Array<{
    name: string;
    num_docs: number;
    size_in_bytes: number;
  }>;
}

export async function getDataStreamsMeteringStats({
  esClient,
  dataStreams,
}: {
  esClient: ElasticsearchClient;
  dataStreams: string[];
}): Promise<Record<string, { size?: string; sizeBytes: number; totalDocs: number }>> {
  if (!dataStreams.length) {
    return {};
  }

  const { datastreams: dataStreamsStats } = await reduceAsyncChunks(
    dataStreams,
    (dataStreamsChunk) =>
      esClient.transport.request<MeteringStatsResponse>({
        method: 'GET',
        path: `/_metering/stats/` + dataStreamsChunk.join(','),
      })
  );

  return dataStreamsStats.reduce(
    (acc, dataStream) => ({
      ...acc,
      [dataStream.name]: {
        sizeBytes: dataStream.size_in_bytes,
        totalDocs: dataStream.num_docs,
      },
    }),
    {}
  );
}

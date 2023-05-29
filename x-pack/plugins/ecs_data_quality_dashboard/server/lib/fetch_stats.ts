/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IndicesStatsIndicesStats,
  IndicesStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';

interface DataStream {
  data_stream?: string;
  template?: string;
}
type IndicesStatsIndicesStatsWithDataStream = Record<string, IndicesStatsIndicesStats & DataStream>;

export interface IndicesStatsResponseDataStream extends IndicesStatsResponse {
  indices?: IndicesStatsIndicesStatsWithDataStream;
}

export const fetchStats = async (
  client: IScopedClusterClient,
  indexPattern: string
): Promise<IndicesStatsResponseDataStream> => {
  const { data_streams: dataStreams } = await client.asCurrentUser.indices.getDataStream();

  const stats = await client.asCurrentUser.indices.stats({
    expand_wildcards: ['open'],
    index: indexPattern,
  });

  const indicesStatsDataStream = dataStreams.reduce<IndicesStatsIndicesStatsWithDataStream>(
    (acc, { indices: dataStreamIndices, name: dataStreamName, template }) => {
      dataStreamIndices.forEach(({ index_name: indexName }) => {
        if (stats?.indices?.[indexName]) {
          acc[indexName] = {
            ...stats?.indices?.[indexName],
            data_stream: dataStreamName,
            template,
          };
        }
      });
      return acc;
    },
    {}
  );

  return {
    _shards: stats._shards,
    _all: stats._all,
    indices: { ...stats.indices, ...indicesStatsDataStream },
  };
};

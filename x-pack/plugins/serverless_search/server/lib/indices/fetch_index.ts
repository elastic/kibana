/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fetchConnectorByIndexName } from '@kbn/search-connectors';

import { FetchIndexResult } from '../../../common/types';

export async function fetchIndex(
  client: ElasticsearchClient,
  indexName: string
): Promise<FetchIndexResult | undefined> {
  const [indexData, indexStats, indexCount, connector] = await Promise.all([
    client.indices.get({ index: indexName }),
    client.indices.stats({ index: indexName }),
    client.count({ index: indexName }),
    fetchConnectorByIndexName(client, indexName),
  ]);
  if (!indexData || !indexData[indexName]) return undefined;

  const index = indexData[indexName];
  return {
    index: {
      ...index,
      count: indexCount.count,
      connector,
      stats: indexStats.indices?.[indexName],
    },
  };
}

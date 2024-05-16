/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CatIndicesResponse } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { fetchConnectorByIndexName } from '@kbn/search-connectors';
import { FetchIndexResult, IndexStorage } from '../../../common/types';

export async function fetchIndex(
  client: ElasticsearchClient,
  indexName: string
): Promise<FetchIndexResult | undefined> {
  const [indexDataResult, indexCatResult, indexCountResult, connectorResult] =
    await Promise.allSettled([
      client.indices.get({ index: indexName }),
      client.cat.indices({ index: indexName, format: 'json' }),
      client.count({ index: indexName }),
      fetchConnectorByIndexName(client, indexName),
    ]);

  if (indexDataResult.status === 'rejected') {
    throw indexDataResult.reason;
  }
  const indexData = indexDataResult.value;
  if (!indexData || !indexData[indexName]) return undefined;

  const index = indexData[indexName];
  const count = indexCountResult.status === 'fulfilled' ? indexCountResult.value.count : 0;
  const connector = connectorResult.status === 'fulfilled' ? connectorResult.value : undefined;

  const indexCat: Record<string, CatIndicesResponse | undefined> =
    indexCatResult.status === 'fulfilled' ? Object.assign({}, ...indexCatResult.value) : {};
  const datasetSize = indexCat['dataset.size']?.toString() ?? '0kb';
  const indexStorage: IndexStorage = {
    deletedDocs: parseInt(indexCat['docs.deleted']?.toString() ?? '0', 10),
    totalStoreSize: datasetSize.toString().toUpperCase(),
  };
  return {
    index: {
      ...index,
      count,
      connector,
      indexStorage,
    },
  };
}

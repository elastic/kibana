/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { ElasticsearchIndexWithIngestion } from '../../../common/types/indices';
import { fetchConnectorByIndexName } from '../connectors/fetch_connectors';
import { fetchCrawlerByIndexName } from '../crawler/fetch_crawlers';

import { mapIndexStats } from './fetch_indices';

export const fetchIndex = async (
  client: IScopedClusterClient,
  index: string
): Promise<ElasticsearchIndexWithIngestion> => {
  const indexDataResult = await client.asCurrentUser.indices.get({ index });
  const indexData = indexDataResult[index];
  const { indices } = await client.asCurrentUser.indices.stats({ index });

  const { count } = await client.asCurrentUser.count({ index });

  if (!indices || !indices[index] || !indexData) {
    throw new Error('404');
  }
  const indexStats = indices[index];
  const indexResult = {
    count,
    ...mapIndexStats(indexData, indexStats, index),
  };

  const connector = await fetchConnectorByIndexName(client, index);
  if (connector) {
    return {
      ...indexResult,
      connector,
    };
  }

  const crawler = await fetchCrawlerByIndexName(client, index);
  if (crawler) {
    return { ...indexResult, crawler };
  }

  return indexResult;
};

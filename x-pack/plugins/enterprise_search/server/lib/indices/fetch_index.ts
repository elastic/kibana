/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { Crawler } from '../../types/crawler';
import { fetchConnectorByIndexName } from '../connectors/fetch_connectors';

import { mapIndexStats } from './fetch_indices';

export const fetchIndex = async (client: IScopedClusterClient, index: string) => {
  const indexDataResult = await client.asCurrentUser.indices.get({ index });
  const indexData = indexDataResult[index];
  const { indices } = await client.asCurrentUser.indices.stats({ index });
  if (!indices || !indices[index] || !indexData) {
    throw new Error('404');
  }
  const indexStats = indices[index];
  const indexResult = mapIndexStats(indexData, indexStats, index);

  const connector = await fetchConnectorByIndexName(client, index);
  if (connector) {
    return {
      connector,
      index: indexResult,
    };
  }

  const crawlerResult = await client.asCurrentUser.search<Crawler>({
    index: '.ent-search-actastic-crawler2_configurations',
    query: { term: { index_name: index } },
  });
  const crawler = crawlerResult.hits.hits[0]?._source;

  if (crawler) {
    return {
      crawler,
      index: indexResult,
    };
  }

  return { index: indexResult };
};

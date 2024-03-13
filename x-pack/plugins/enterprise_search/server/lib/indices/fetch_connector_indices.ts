/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { fetchConnectors } from '@kbn/search-connectors';

import { ElasticsearchIndexWithPrivileges } from '../../../common/types/indices';
import { isNotNullish } from '../../../common/utils/is_not_nullish';
import { fetchCrawlers } from '../crawler/fetch_crawlers';

import { fetchIndexCounts } from './fetch_index_counts';
import { fetchIndexPrivileges } from './fetch_index_privileges';
import { TotalIndexData } from './fetch_indices';
import { getIndexDataMapper, getUnattachedIndexData } from './utils/get_index_data';

export const fetchConnectorIndices = async (
  client: IScopedClusterClient,
  searchQuery: string | undefined,
  from: number,
  size: number
): Promise<{
  indexNames: string[];
  indices: ElasticsearchIndexWithPrivileges[];
  totalResults: number;
}> => {
  const { indexData, indexNames } = await getUnattachedIndexData(client, searchQuery);
  const connectors = await fetchConnectors(client.asCurrentUser, indexNames);
  const crawlers = await fetchCrawlers(client, indexNames);

  const connectedIndexNames = [
    ...connectors.map((con) => con.index_name).filter(isNotNullish),
    ...crawlers.map((crawler) => crawler.index_name).filter(isNotNullish),
  ];

  const indexNameSlice = indexNames
    .filter((indexName) => !connectedIndexNames.includes(indexName))
    .slice(from, from + size)
    .filter(isNotNullish);
  if (indexNameSlice.length === 0) {
    return {
      indexNames: [],
      indices: [],
      totalResults: indexNames.length,
    };
  }

  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    index: indexNameSlice,
    metric: ['docs', 'store'],
  });

  const indexPrivileges = await fetchIndexPrivileges(client, indexNameSlice);

  const indexCounts = await fetchIndexCounts(client, indexNameSlice);

  const totalIndexData: TotalIndexData = {
    allIndexMatches: indexData,
    indexCounts,
    indexPrivileges,
    indicesStats,
  };

  const indices = indexNameSlice
    .map(getIndexDataMapper(totalIndexData))
    .map(({ name, ...index }) => {
      return {
        ...index,
        alias: false,
        count: indexCounts[name] ?? 0,
        name,
        privileges: { manage: false, read: false, ...indexPrivileges[name] },
      };
    });

  return {
    indexNames: indexNameSlice,
    indices,
    totalResults: indexNames.length,
  };
};

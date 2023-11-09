/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchRequestItem, SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server/src/client/scoped_cluster_client';

import { EnterpriseSearchApplicationIndex } from '../../../common/types/search_applications';

import { availableIndices } from './available_indices';

export const fetchIndicesStats = async (
  client: IScopedClusterClient,
  indices: string[]
): Promise<EnterpriseSearchApplicationIndex[]> => {
  const indicesStats = await client.asCurrentUser.indices.stats({
    index: await availableIndices(client, indices),
  });

  const searches: MsearchRequestItem[] = [];
  indices.forEach((index) => {
    searches.push({ index });
    searches.push({ size: 0, track_total_hits: true });
  });
  const msearchResponse = await client.asCurrentUser.msearch({ searches });
  const docCounts = msearchResponse.responses.map((response) => {
    if ('error' in response) {
      return null;
    }

    const totalHits = response.hits.total as SearchTotalHits;
    return totalHits.value;
  });

  return indices.map((indexName, number) => {
    const indexStats = indicesStats.indices?.[indexName];
    return {
      count: docCounts[number] ?? null,
      health: indexStats?.health ?? 'unknown',
      name: indexName,
    };
  });
};

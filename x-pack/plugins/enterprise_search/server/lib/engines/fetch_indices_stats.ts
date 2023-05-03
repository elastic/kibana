/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server/src/client/scoped_cluster_client';

import { EnterpriseSearchEngineIndex } from '../../../common/types/engines';

export const fetchIndicesStats = async (client: IScopedClusterClient, indices: string[]) => {
  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    index: indices,
    metric: ['docs'],
  });

  const indicesWithStats = indices.map((indexName: string) => {
    const indexStats = indicesStats[indexName];
    const hydratedIndex: EnterpriseSearchEngineIndex = {
      count: indexStats?.primaries?.docs?.count ?? 0,
      health: indexStats?.health ?? 'unknown',
      name: indexName,
    };
    return hydratedIndex;
  });

  return indicesWithStats;
};

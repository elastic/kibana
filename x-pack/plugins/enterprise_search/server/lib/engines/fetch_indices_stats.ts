/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server/src/client/scoped_cluster_client';

import { EnterpriseSearchEngineIndex } from '../../../common/types/engines';

export const fetchIndicesStats = async (client: IScopedClusterClient, indicesNames: string[]) => {
  const { indices: indicesStats = {} } = await client.asCurrentUser.indices.stats({
    index: indicesNames,
    metric: ['docs'],
  });
  const indicesWithStats = indicesNames.map((indexName: string) => {
    const indiceStats = indicesStats[indexName];
    const hydratedIndex: EnterpriseSearchEngineIndex = {
      name: indexName,
      health: indiceStats?.health ?? 'unknown',
      count: indiceStats?.total?.docs?.count ?? 0,
    };
    return hydratedIndex;
  });

  return indicesWithStats;
};

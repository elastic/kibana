/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server/src/client/scoped_cluster_client';

import { EnterpriseSearchApplicationIndex } from '../../../common/types/search_applications';

import { availableIndices } from './available_indices';

export const fetchIndicesStats = async (
  client: IScopedClusterClient,
  indices: string[]
): Promise<EnterpriseSearchApplicationIndex[]> => {
  const indicesStats = await client.asCurrentUser.indices.stats({
    index: await availableIndices(client, indices),
    metric: ['docs'],
  });

  return indices.map((index) => {
    const indexStats = indicesStats.indices?.[index];
    return {
      count: indexStats?.primaries?.docs?.count ?? null,
      health: indexStats?.health ?? 'unknown',
      name: index,
    };
  });
};

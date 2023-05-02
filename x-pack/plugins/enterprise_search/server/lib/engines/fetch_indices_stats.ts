/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server/src/client/scoped_cluster_client';

import { EnterpriseSearchEngineIndex } from '../../../common/types/engines';

const fetchIndexStats = async (client: IScopedClusterClient, index: string) => {
  try {
    const resp = await client.asCurrentUser.indices.stats({ index, metric: ['docs'] });
    return resp.indices?.[index] ?? {};
  } catch {
    return {};
  }
};

export const fetchIndicesStats = async (
  client: IScopedClusterClient,
  indices: string[]
): Promise<EnterpriseSearchEngineIndex[]> =>
  Promise.all(
    indices.map(async (index: string) => {
      const stats = await fetchIndexStats(client, index);
      return {
        count: stats.primaries?.docs?.count ?? 0,
        health: stats.health ?? 'unknown',
        name: index,
      };
    })
  );

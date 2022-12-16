/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export const createClusterDataCheck = () => {
  let clusterHasUserData = false;

  return async function doesClusterHaveUserData(esClient: ElasticsearchClient, log: Logger) {
    if (!clusterHasUserData) {
      try {
        const { indices = {} } = await esClient.indices.stats({
          filter_path: 'indices.*.total.docs.count',
        });

        const indexIds = Object.keys(indices);

        clusterHasUserData = indexIds.some((indexId: string) => {
          // Check index to see if it starts with known internal prefixes
          const isInternalIndex = indexId.startsWith('.') || indexId.startsWith('kibana_sample_');

          // Check index to see if it has any docs
          const hasDocs = (indices[indexId].total?.docs?.count || 0) > 0;

          return !isInternalIndex && hasDocs;
        });
      } catch (e) {
        log.warn(`Error encountered while checking cluster for user data: ${e}`);

        clusterHasUserData = false;
      }
    }
    return clusterHasUserData;
  };
};

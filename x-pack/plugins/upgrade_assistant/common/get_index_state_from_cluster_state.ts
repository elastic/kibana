/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ClusterStateAPIResponse } from './types';

const checkAllAliases = (
  indexName: string,
  clusterState: ClusterStateAPIResponse
): 'open' | 'close' => {
  for (const index of Object.values(clusterState.metadata.indices)) {
    if (index.aliases?.some((alias) => alias === indexName)) {
      return index.state;
    }
  }

  throw new Error(`${indexName} not found in cluster state!`);
};

export const getIndexStateFromClusterState = (
  indexName: string,
  clusterState: ClusterStateAPIResponse
): 'open' | 'close' =>
  clusterState.metadata.indices[indexName]
    ? clusterState.metadata.indices[indexName].state
    : checkAllAliases(indexName, clusterState);

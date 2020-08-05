/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { getIndexStateFromClusterState } from '../../common/get_index_state_from_cluster_state';
import { ClusterStateAPIResponse } from '../../common/types';

type StatusCheckResult = Record<string, 'open' | 'close'>;

export const esIndicesStateCheck = async (
  callAsUser: LegacyAPICaller,
  indices: string[]
): Promise<StatusCheckResult> => {
  // According to https://www.elastic.co/guide/en/elasticsearch/reference/7.6/cluster-state.html
  // The response from this call is considered internal and subject to change. We have an API
  // integration test for asserting that the current ES version still returns what we expect.
  // This lives in x-pack/test/upgrade_assistant_integration
  const clusterState: ClusterStateAPIResponse = await callAsUser('cluster.state', {
    index: indices,
    metric: 'metadata',
  });

  const result: StatusCheckResult = {};

  indices.forEach((index) => {
    result[index] = getIndexStateFromClusterState(index, clusterState);
  });

  return result;
};

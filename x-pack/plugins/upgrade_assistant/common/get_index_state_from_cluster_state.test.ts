/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getIndexStateFromClusterState } from './get_index_state_from_cluster_state';
import { ClusterStateAPIResponse } from './types';

describe('getIndexStateFromClusterState', () => {
  const indexName = 'indexName';
  const clusterState: ClusterStateAPIResponse = {
    metadata: {
      indices: {},
      cluster_coordination: {} as any,
      cluster_uuid: 'test',
      templates: {} as any,
    },
    cluster_name: 'test',
    cluster_uuid: 'test',
  };

  afterEach(() => {
    clusterState.metadata.indices = {};
  });

  it('correctly extracts state from cluster state', () => {
    clusterState.metadata.indices[indexName] = { state: 'open' } as any;
    clusterState.metadata.indices.aTotallyDifferentIndex = { state: 'close' } as any;
    expect(getIndexStateFromClusterState(indexName, clusterState)).toBe('open');
  });

  it('correctly extracts state from aliased index in cluster state', () => {
    clusterState.metadata.indices.aTotallyDifferentName = {
      state: 'close',
      aliases: [indexName, 'test'],
    } as any;
    clusterState.metadata.indices.aTotallyDifferentName1 = {
      state: 'open',
      aliases: ['another', 'test'],
    } as any;

    expect(getIndexStateFromClusterState(indexName, clusterState)).toBe('close');
  });

  it('throws if the index name cannot be found in the cluster state', () => {
    expect(() => getIndexStateFromClusterState(indexName, clusterState)).toThrow('not found');
    clusterState.metadata.indices.aTotallyDifferentName1 = {
      state: 'open',
      aliases: ['another', 'test'],
    } as any;
    expect(() => getIndexStateFromClusterState(indexName, clusterState)).toThrow('not found');
  });
});

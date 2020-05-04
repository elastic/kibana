/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchClusterState } from './fetch_cluster_state';

describe('fetchClusterState', () => {
  it('should return the cluster state', async () => {
    const status = 'green';
    const clusterUuid = 'sdfdsaj34434';
    const callCluster = jest.fn(() => ({
      hits: {
        hits: [
          {
            _source: {
              cluster_state: {
                status,
              },
              cluster_uuid: clusterUuid,
            },
          },
        ],
      },
    }));

    const clusters = [{ clusterUuid, clusterName: 'foo' }];
    const index = '.monitoring-es-*';

    const state = await fetchClusterState(callCluster, clusters, index);
    expect(state).toEqual([
      {
        state: status,
        clusterUuid,
      },
    ]);
  });
});

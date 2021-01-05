/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchClusterHealth } from './fetch_cluster_health';

describe('fetchClusterHealth', () => {
  it('should return the cluster health', async () => {
    const status = 'green';
    const clusterUuid = 'sdfdsaj34434';
    const callCluster = jest.fn(() => ({
      hits: {
        hits: [
          {
            _index: '.monitoring-es-7',
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

    const health = await fetchClusterHealth(callCluster, clusters, index, 1);
    expect(health).toEqual([
      {
        health: status,
        clusterUuid,
        ccs: undefined,
      },
    ]);
  });
});

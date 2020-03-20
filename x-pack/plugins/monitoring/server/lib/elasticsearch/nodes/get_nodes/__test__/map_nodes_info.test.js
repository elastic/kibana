/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapNodesInfo } from '../map_nodes_info';

describe('map nodes info', () => {
  it('should summarize the info', () => {
    const nodeHits = [
      {
        _source: {
          source_node: {
            uuid: 'ENVgDIKRSdCVJo-YqY4kUQ',
            host: 'spicy.local',
            transport_address: '127.0.0.1:9300',
            ip: '127.0.0.1',
            name: 'node01',
            timestamp: '2018-02-14T17:51:40.386Z',
          },
        },
      },
      {
        _source: {
          source_node: {
            uuid: 't9J9jvHpQ2yDw9c1LJ0tHA',
            host: 'spicy.local',
            transport_address: '127.0.0.1:9301',
            ip: '127.0.0.1',
            name: 'node02',
            timestamp: '2018-02-14T17:46:31.520Z',
          },
        },
      },
    ];
    const clusterStats = {
      cluster_uuid: 'fHJwISmKTFO8bj57oFBLUQ',
      cluster_name: 'starburst',
      version: '7.0.0-alpha1',
      cluster_state: {
        nodes_hash: -1493103427,
        status: 'yellow',
        version: 167,
        state_uuid: '4bhqtA_YS5a6vQkuGwXVmg',
        master_node: 'ENVgDIKRSdCVJo-YqY4kUQ',
        nodes: {
          'ENVgDIKRSdCVJo-YqY4kUQ': {
            name: 'node01',
            ephemeral_id: 'J6bDpP4dSHK1zBcfk506XA',
            transport_address: '127.0.0.1:9300',
            attributes: {
              'ml.machine_memory': '17179869184',
              'ml.max_open_jobs': '20',
            },
          },
        },
      },
    };
    const shardStats = {
      indicesTotals: {
        primary: 57,
        replica: 0,
        unassigned: { primary: 0, replica: 41 },
      },
      nodes: {
        'ENVgDIKRSdCVJo-YqY4kUQ': {
          shardCount: 57,
          indexCount: 25,
          name: 'node01',
          node_ids: ['ENVgDIKRSdCVJo-YqY4kUQ'],
          type: 'master',
        },
      },
    };

    expect(mapNodesInfo(nodeHits, clusterStats, shardStats)).toMatchSnapshot();
  });
});

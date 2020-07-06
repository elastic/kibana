/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNodesShardCount } from './get_nodes_shard_count';

describe('getNodeShardCount', () => {
  it('should return the shard count per node', async () => {
    const nodes = {
      12345: { shardCount: 10 },
      6789: { shardCount: 1 },
      absdf82: { shardCount: 20 },
    };

    const req = {
      server: {
        config: () => ({
          get: () => {},
        }),
        plugins: {
          elasticsearch: {
            getCluster: () => ({
              callWithRequest: () => ({
                aggregations: {
                  nodes: {
                    buckets: Object.keys(nodes).map((id) => ({
                      key: id,
                      doc_count: nodes[id].shardCount,
                    })),
                  },
                },
              }),
            }),
          },
        },
      },
    };
    const esIndexPattern = '*';
    const cluster = {};
    const counts = await getNodesShardCount(req, esIndexPattern, cluster);
    expect(counts.nodes).toEqual(nodes);
  });
});

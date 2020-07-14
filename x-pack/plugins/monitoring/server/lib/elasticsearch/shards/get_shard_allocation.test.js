/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleResponse } from './get_shard_allocation';

describe('get_shard_allocation', () => {
  const exampleShardSource = {
    cluster_uuid: 'Xb_iFZeMSDialSlUwnH53w',
    state_uuid: 'Xobm9shMQGa2p52j-Vh61A',
    type: 'shards',
    timestamp: '2018-07-05T23:59:51.259Z',
  };

  const shards = [
    {
      node: 'X7Cq5UJ9TrS6gWVLItV-0A',
      index: 'my-index-v1',
      relocating_node: null,
      state: 'STARTED',
      shard: 0,
      primary: true,
    },
    {
      node: 'Y8Cq5UJ9TrS6gWVLItV-0A',
      index: 'my-index-v1',
      relocating_node: null,
      state: 'STARTED',
      shard: 0,
      primary: false,
    },
  ];

  describe('handleResponse', () => {
    it('deduplicates shards', () => {
      const nextTimestamp = '2018-07-06T00:00:01.259Z';
      const hits = shards.map((shard) => {
        return {
          _source: {
            ...exampleShardSource,
            shard,
          },
        };
      });

      // duplicate all of them; this is how a response would really come back, with only the timestamp changed
      hits.concat(
        hits.map((hit) => {
          return {
            ...hit,
            timestamp: nextTimestamp,
          };
        })
      );

      const deduplicatedShards = handleResponse({ hits: { hits } });

      expect(deduplicatedShards).toHaveLength(shards.length);
      deduplicatedShards.forEach((shard, index) => {
        expect(shard).toMatchObject(shards[index]);
      });
    });
  });
});

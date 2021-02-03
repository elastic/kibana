/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { normalizeIndexShards, normalizeNodeShards } from './normalize_shard_objects';

function getIndexShardBucket(indexName) {
  return {
    // the index name being something we actually don't expect is intentional to ensure the object is not colliding
    key: indexName,
    doc_count: 5,
    states: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'STARTED',
          doc_count: 1,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 1, key_as_string: 'true', doc_count: 1 }],
          },
        },
        {
          key: 'RELOCATING',
          doc_count: 1,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 1, key_as_string: 'true', doc_count: 1 }],
          },
        },
        {
          key: 'INITIALIZING',
          doc_count: 1,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 1, key_as_string: 'true', doc_count: 1 }],
          },
        },
        {
          key: 'UNASSIGNED',
          doc_count: 2,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 0, key_as_string: 'false', doc_count: 2 }],
          },
        },
      ],
    },
  };
}

function getNodeShardBucket(nodeId) {
  return {
    key: nodeId,
    doc_count: 30,
    node_transport_address: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: '127.0.0.1:9301',
          doc_count: 3,
          max_timestamp: {
            value: 1457561181492,
            value_as_string: '2016-03-09T22:06:21.492Z',
          },
        },
      ],
    },
    node_names: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: 'Spider-Woman',
          doc_count: 3,
          max_timestamp: {
            value: 1457561181492,
            value_as_string: '2016-03-09T22:06:21.492Z',
          },
        },
      ],
    },
    node_data_attributes: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    node_master_attributes: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [],
    },
    node_ids: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 0,
      buckets: [
        {
          key: nodeId,
          doc_count: 3,
        },
      ],
    },
    index_count: {
      value: 6,
    },
  };
}

describe('Normalizing Shard Data', () => {
  describe('Index Shards', () => {
    it('Calculates the Index Shard data for a result bucket', () => {
      const indices = [getIndexShardBucket('nodes'), getIndexShardBucket('toads')];
      const result = indices.reduce(normalizeIndexShards, {});

      expect(result.nodes.status).toBe('red');
      expect(result.nodes.primary).toBe(2); // "STARTED" and "RELOCATING" shards are counted as assigned primaries
      expect(result.nodes.replica).toBe(0);
      expect(result.nodes.unassigned.primary).toBe(1);
      expect(result.nodes.unassigned.replica).toBe(2);

      expect(result.toads.status).toBe('red');
      expect(result.toads.primary).toBe(2);
      expect(result.toads.replica).toBe(0);
      expect(result.toads.unassigned.primary).toBe(1);
      expect(result.toads.unassigned.replica).toBe(2);
    });
  });

  describe('Node Shards', () => {
    it('Calculates the Node Shard data for a result bucket', () => {
      const nodes = [getNodeShardBucket('someMasterNode'), getNodeShardBucket('somePlainNode')];
      const normalizeFn = normalizeNodeShards('someMasterNode');
      const result = nodes.reduce(normalizeFn, {});

      expect(result.someMasterNode.node_ids).toBeInstanceOf(Object);
      expect(result.someMasterNode.indexCount).toBe(6);
      expect(result.someMasterNode.shardCount).toBe(30);
      expect(result.someMasterNode.name).toBe('Spider-Woman');
      expect(result.someMasterNode.type).toBe('master');

      expect(result.somePlainNode.node_ids).toBeInstanceOf(Object);
      expect(result.somePlainNode.indexCount).toBe(6);
      expect(result.somePlainNode.shardCount).toBe(30);
      expect(result.somePlainNode.type).toBe('node');
    });
  });
});

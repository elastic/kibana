/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import expect from '@kbn/expect';
import { handleResponse } from '../get_shard_stats';
import { shardStatsFixture, clusterFixture } from './fixtures';

let resp;
let cluster;
let includeNodes;
let includeIndices;

describe('getShardStats handler', () => {
  beforeEach(() => {
    resp = cloneDeep(shardStatsFixture);
    cluster = cloneDeep(clusterFixture);

    includeNodes = false;
    includeIndices = false;
  });

  it('returns a default if response is empty', () => {
    const result = handleResponse({}, includeNodes, includeNodes, {});
    expect(result).to.eql({
      indicesTotals: undefined,
      indices: undefined,
      nodes: undefined,
    });
  });

  describe('calculates indicesTotals', () => {
    it('for green cluster status - no unassigned', () => {
      const result = handleResponse(resp, includeNodes, includeNodes, cluster);
      expect(result).to.eql({
        indicesTotals: {
          primary: 26,
          replica: 26,
          unassigned: {
            primary: 0,
            replica: 0,
          },
        },
        indices: undefined,
        nodes: undefined,
      });
    });

    it('for yellow cluster status - has unassigned replica', () => {
      const climateBucket = resp.aggregations.indices.buckets.find((b) => b.key === 'climate');
      climateBucket.states.buckets = [
        {
          key: 'STARTED',
          doc_count: 5,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 1,
                key_as_string: 'true',
                doc_count: 5,
              },
            ],
          },
        },
        {
          key: 'UNASSIGNED',
          doc_count: 5,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 0,
                key_as_string: 'false',
                doc_count: 5,
              },
            ],
          },
        },
      ];
      const result = handleResponse(resp, includeNodes, includeNodes, cluster);
      expect(result).to.eql({
        indicesTotals: {
          primary: 26,
          replica: 21,
          unassigned: {
            primary: 0,
            replica: 5,
          },
        },
        indices: undefined,
        nodes: undefined,
      });
    });

    it('for red cluster status - has unassigned primary', () => {
      const climateBucket = resp.aggregations.indices.buckets.find((b) => b.key === 'climate');
      climateBucket.states.buckets = [
        {
          key: 'STARTED',
          doc_count: 5,
          primary: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 1,
                key_as_string: 'true',
                doc_count: 5,
              },
            ],
          },
        },
      ];
      const result = handleResponse(resp, includeNodes, includeNodes, cluster);
      expect(result).to.eql({
        indicesTotals: {
          primary: 26,
          replica: 21,
          unassigned: {
            primary: 0,
            replica: 0,
          },
        },
        indices: undefined,
        nodes: undefined,
      });
    });
  });

  it('returns nodes info and indicesTotals calculation', () => {
    includeNodes = true;
    const result = handleResponse(resp, includeNodes, includeIndices, cluster);
    expect(result).to.eql({
      indicesTotals: { primary: 26, replica: 26, unassigned: { primary: 0, replica: 0 } },
      indices: undefined,
      nodes: {
        B1wJG9MRQoG2ltcvZG2cRw: {
          indexCount: 10,
          name: 'whatever-01',
          node_ids: ['B1wJG9MRQoG2ltcvZG2cRw'],
          shardCount: 26,
          type: 'master', // determined from clusterFixture
        },
        'GtwLXgbbTEC-sM5ltEqbjg': {
          indexCount: 10,
          name: 'whatever-02',
          node_ids: ['GtwLXgbbTEC-sM5ltEqbjg'],
          shardCount: 26,
          type: 'node',
        },
      },
    });
  });

  it('returns indices info and indicesTotals calculation', () => {
    includeIndices = true;
    const result = handleResponse(resp, includeNodes, includeIndices, cluster);
    expect(result).to.eql({
      indicesTotals: { primary: 26, replica: 26, unassigned: { primary: 0, replica: 0 } },
      indices: {
        '.ml-anomalies-shared': {
          status: 'green',
          primary: 5,
          replica: 5,
          unassigned: { primary: 0, replica: 0 },
        },
        'avocado-tweets-2017.09.14': {
          status: 'green',
          primary: 5,
          replica: 5,
          unassigned: { primary: 0, replica: 0 },
        },
        climate: {
          status: 'green',
          primary: 5,
          replica: 5,
          unassigned: { primary: 0, replica: 0 },
        },
        'watermelon-tweets-2017.09.14': {
          status: 'green',
          primary: 5,
          replica: 5,
          unassigned: { primary: 0, replica: 0 },
        },
        '.kibana': {
          status: 'green',
          primary: 1,
          replica: 1,
          unassigned: { primary: 0, replica: 0 },
        },
        '.ml-notifications': {
          status: 'green',
          primary: 1,
          replica: 1,
          unassigned: { primary: 0, replica: 0 },
        },
        '.security-v6': {
          status: 'green',
          primary: 1,
          replica: 1,
          unassigned: { primary: 0, replica: 0 },
        },
        '.triggered_watches': {
          status: 'green',
          primary: 1,
          replica: 1,
          unassigned: { primary: 0, replica: 0 },
        },
        '.watcher-history-6-2017.09.18': {
          status: 'green',
          primary: 1,
          replica: 1,
          unassigned: { primary: 0, replica: 0 },
        },
        '.watches': {
          status: 'green',
          primary: 1,
          replica: 1,
          unassigned: { primary: 0, replica: 0 },
        },
      },
      nodes: undefined,
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  fetchLogstashStats,
  fetchLogstashState,
  processStatsResults,
  processLogstashStateResults,
} from './get_logstash_stats';
import sinon from 'sinon';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logstashStatsResultSet = require('./__mocks__/fixtures/logstash_stats_results');

const resultsMap = new Map();

// Load data for state results.
['1n1p', '1nmp', 'mnmp'].forEach((data) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  resultsMap.set(data, require(`./__mocks__/fixtures/logstash_state_results_${data}`));
});

const getBaseOptions = () => ({
  clusters: {},
  allEphemeralIds: {},
  versions: {},
  plugins: {},
});

describe('Get Logstash Stats', () => {
  const clusterUuids = ['aCluster', 'bCluster', 'cCluster'];
  let callCluster = sinon.stub();

  beforeEach(() => {
    callCluster = sinon.stub();
  });

  describe('fetchLogstashState', () => {
    const clusterUuid = 'a';
    const ephemeralIds = ['a', 'b', 'c'];
    it('should create the logstash state query correctly', async () => {
      const expected = {
        bool: {
          filter: [
            {
              terms: {
                'logstash_state.pipeline.ephemeral_id': ['a', 'b', 'c'],
              },
            },
            {
              bool: {
                must: {
                  term: { type: 'logstash_state' },
                },
              },
            },
          ],
        },
      };

      await fetchLogstashState(callCluster, clusterUuid, ephemeralIds, {} as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;
      expect(api).toEqual('search');
      expect(body.query).toEqual(expected);
    });

    it('should set `from: 0, to: 10000` in the query', async () => {
      await fetchLogstashState(callCluster, clusterUuid, ephemeralIds, {} as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;
      expect(api).toEqual('search');
      expect(body.from).toEqual(0);
      expect(body.size).toEqual(10000);
    });

    it('should set `from: 10000, to: 10000` in the query', async () => {
      await fetchLogstashState(callCluster, clusterUuid, ephemeralIds, {
        page: 1,
      } as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).toEqual('search');
      expect(body.from).toEqual(10000);
      expect(body.size).toEqual(10000);
    });

    it('should set `from: 20000, to: 10000` in the query', async () => {
      await fetchLogstashState(callCluster, clusterUuid, ephemeralIds, {
        page: 2,
      } as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).toEqual('search');
      expect(body.from).toEqual(20000);
      expect(body.size).toEqual(10000);
    });
  });

  describe('fetchLogstashStats', () => {
    it('should set `from: 0, to: 10000` in the query', async () => {
      await fetchLogstashStats(callCluster, clusterUuids, {} as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).toEqual('search');
      expect(body.from).toEqual(0);
      expect(body.size).toEqual(10000);
    });

    it('should set `from: 10000, to: 10000` in the query', async () => {
      await fetchLogstashStats(callCluster, clusterUuids, { page: 1 } as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).toEqual('search');
      expect(body.from).toEqual(10000);
      expect(body.size).toEqual(10000);
    });

    it('should set `from: 20000, to: 10000` in the query', async () => {
      await fetchLogstashStats(callCluster, clusterUuids, { page: 2 } as any);
      const { args } = callCluster.firstCall;
      const [api, { body }] = args;

      expect(api).toEqual('search');
      expect(body.from).toEqual(20000);
      expect(body.size).toEqual(10000);
    });
  });

  describe('processLogstashStatsResults', () => {
    it('should summarize empty results', () => {
      const resultsEmpty = undefined;

      const options = getBaseOptions();
      processStatsResults(resultsEmpty as any, options);

      expect(options.clusters).toStrictEqual({});
    });

    it('should summarize single result with some missing fields', () => {
      const results = {
        hits: {
          hits: [
            {
              _source: {
                type: 'logstash_stats',
                cluster_uuid: 'FlV4ckTxQ0a78hmBkzzc9A',
                logstash_stats: {
                  logstash: {
                    uuid: '61de393a-f2b6-4b6c-8cea-22661f9c4134',
                  },
                  pipelines: [
                    {
                      id: 'main',
                      ephemeral_id: 'cf37c6fa-2f1a-41e2-9a89-36b420a8b9a5',
                      queue: {
                        type: 'memory',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      };

      const options = getBaseOptions();
      processStatsResults(results as any, options);

      expect(options.clusters).toStrictEqual({
        FlV4ckTxQ0a78hmBkzzc9A: {
          count: 1,
          cluster_stats: {
            plugins: [],
            collection_types: {
              internal_collection: 1,
            },
            pipelines: {},
            queues: {
              memory: 1,
            },
          },
          versions: [],
        },
      });
    });

    it('should summarize stats from hits across multiple result objects', () => {
      const options = getBaseOptions();

      // logstashStatsResultSet is an array of many small query results
      logstashStatsResultSet.forEach((results: any) => {
        processStatsResults(results, options);
      });

      resultsMap.forEach((value: string[], clusterUuid: string) => {
        value.forEach((results: any) => {
          processLogstashStateResults(results, clusterUuid, options);
        });
      });

      expect(options.clusters).toStrictEqual({
        '1n1p': {
          count: 1,
          versions: [
            {
              count: 1,
              version: '7.10.0',
            },
          ],
          cluster_stats: {
            collection_types: {
              internal_collection: 1,
            },
            pipelines: {
              batch_size_avg: 125,
              batch_size_max: 125,
              batch_size_min: 125,
              batch_size_total: 125,
              count: 1,
              sources: {
                file: true,
              },
              workers_avg: 1,
              workers_max: 1,
              workers_min: 1,
              workers_total: 1,
            },
            plugins: [
              {
                count: 1,
                name: 'logstash-input-stdin',
              },
              {
                count: 1,
                name: 'logstash-input-elasticsearch',
              },
              {
                count: 3,
                name: 'logstash-filter-mutate',
              },
              {
                count: 3,
                name: 'logstash-filter-ruby',
              },
              {
                count: 1,
                name: 'logstash-filter-split',
              },
              {
                count: 1,
                name: 'logstash-filter-elasticsearch',
              },
              {
                count: 1,
                name: 'logstash-filter-aggregate',
              },
              {
                count: 1,
                name: 'logstash-filter-drop',
              },
              {
                count: 1,
                name: 'logstash-output-elasticsearch',
              },
              {
                count: 1,
                name: 'logstash-output-stdout',
              },
            ],
            queues: {
              memory: 1,
            },
          },
        },
        '1nmp': {
          count: 1,
          versions: [
            {
              count: 1,
              version: '7.8.0',
            },
          ],
          cluster_stats: {
            collection_types: {
              metricbeat: 1,
            },
            pipelines: {
              batch_size_avg: 406.5,
              batch_size_max: 1251,
              batch_size_min: 125,
              batch_size_total: 1626,
              count: 4,
              sources: {
                xpack: true,
              },
              workers_avg: 17.25,
              workers_max: 44,
              workers_min: 1,
              workers_total: 69,
            },
            plugins: [
              {
                count: 4,
                name: 'logstash-input-stdin',
              },
              {
                count: 4,
                name: 'logstash-output-stdout',
              },
            ],
            queues: {
              memory: 3,
              persisted: 1,
            },
          },
        },
        mnmp: {
          count: 3,
          versions: [
            {
              count: 1,
              version: '7.9.2',
            },
            {
              count: 1,
              version: '7.9.1',
            },
            {
              count: 1,
              version: '7.10.0',
            },
          ],
          cluster_stats: {
            collection_types: {
              internal_collection: 3,
            },
            pipelines: {
              batch_size_avg: 33.294117647058826,
              batch_size_max: 125,
              batch_size_min: 1,
              batch_size_total: 566,
              count: 17,
              sources: {
                file: true,
                string: true,
              },
              workers_avg: 7.411764705882353,
              workers_max: 16,
              workers_min: 1,
              workers_total: 126,
            },
            plugins: [
              {
                count: 1,
                name: 'logstash-input-stdin',
              },
              {
                count: 1,
                name: 'logstash-filter-clone',
              },
              {
                count: 3,
                name: 'logstash-output-pipeline',
              },
              {
                count: 2,
                name: 'logstash-input-pipeline',
              },
              {
                count: 16,
                name: 'logstash-filter-sleep',
              },
              {
                count: 14,
                name: 'logstash-output-stdout',
              },
              {
                count: 14,
                name: 'logstash-input-generator',
              },
            ],
            queues: {
              memory: 3,
              persisted: 14,
            },
          },
        },
      });
    });
  });
});

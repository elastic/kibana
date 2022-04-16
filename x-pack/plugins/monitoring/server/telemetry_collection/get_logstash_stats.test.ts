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
import { ElasticsearchClient } from '@kbn/core/server';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logstashStatsResultSet = require('./__mocks__/fixtures/logstash_stats_results.json');

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
  const searchMock = sinon.stub();
  const callCluster = { search: searchMock } as unknown as ElasticsearchClient;
  const start = '2022-03-09T00:00:00.000Z';
  const end = '2022-03-09T00:20:00.000Z';

  beforeEach(() => {
    searchMock.returns(Promise.resolve({}));
  });

  afterEach(() => {
    searchMock.reset();
  });

  describe('fetchLogstashState', () => {
    const clusterUuid = 'a';
    const ephemeralIds = ['a', 'b', 'c'];
    it('should create the logstash state query correctly', async () => {
      const expected = {
        bool: {
          filter: [
            {
              range: {
                timestamp: {
                  format: 'epoch_millis',
                  gte: 1646784000000,
                  lte: 1646785200000,
                },
              },
            },
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

      await fetchLogstashState(callCluster, clusterUuid, ephemeralIds, start, end, {} as any);
      const { args } = searchMock.firstCall;
      const [{ body }] = args;
      expect(body.query).toEqual(expected);
    });

    it('should set `from: 0, to: 10000` in the query', async () => {
      await fetchLogstashState(callCluster, clusterUuid, ephemeralIds, start, end, {} as any);
      const { args } = searchMock.firstCall;
      const [{ body }] = args;
      expect(body.from).toEqual(0);
      expect(body.size).toEqual(10000);
    });
  });

  describe('fetchLogstashStats', () => {
    it('should set `from: 0, to: 10000` in the query', async () => {
      await fetchLogstashStats(callCluster, clusterUuids, start, end, {} as any);
      const { args } = searchMock.firstCall;
      const [{ body }] = args;

      expect(body.from).toEqual(0);
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

    it('should retrieve all ephemeral ids from all hits for the same cluster', () => {
      const results = {
        hits: {
          hits: [
            {
              _source: {
                type: 'logstash_stats',
                cluster_uuid: 'FlV4ckTxQ0a78hmBkzzc9A',
                logstash_stats: {
                  logstash: {
                    uuid: '0000000-0000-0000-0000-000000000000',
                  },
                  pipelines: [
                    {
                      id: 'main',
                      ephemeral_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                      queue: {
                        type: 'memory',
                      },
                    },
                  ],
                },
              },
            },
            {
              _source: {
                type: 'logstash_stats',
                cluster_uuid: 'FlV4ckTxQ0a78hmBkzzc9A',
                logstash_stats: {
                  logstash: {
                    uuid: '11111111-1111-1111-1111-111111111111',
                  },
                  pipelines: [
                    {
                      id: 'main',
                      ephemeral_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                      queue: {
                        type: 'memory',
                      },
                    },
                  ],
                },
              },
            },
            {
              _source: {
                type: 'logstash_stats',
                cluster_uuid: '3',
                logstash_stats: {
                  logstash: {
                    uuid: '22222222-2222-2222-2222-222222222222',
                  },
                  pipelines: [
                    {
                      id: 'main',
                      ephemeral_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
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

      expect(options.allEphemeralIds).toStrictEqual({
        FlV4ckTxQ0a78hmBkzzc9A: [
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        ],
        '3': ['cccccccc-cccc-cccc-cccc-cccccccccccc'],
      });

      expect(options.clusters).toStrictEqual({
        FlV4ckTxQ0a78hmBkzzc9A: {
          count: 2,
          cluster_stats: {
            plugins: [],
            collection_types: {
              internal_collection: 2,
            },
            pipelines: {},
            queues: {
              memory: 2,
            },
          },
          versions: [],
        },
        '3': {
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

      expect(options.allEphemeralIds).toStrictEqual({
        '1n1p': ['cf37c6fa-2f1a-41e2-9a89-36b420a8b9a5'],
        '1nmp': [
          '47a70feb-3cb5-4618-8670-2c0bada61acd',
          '5a65d966-0330-4bd7-82f2-ee81040c13cf',
          '8d33fe25-a2c0-4c54-9ecf-d218cb8dbfe4',
          'f4167a94-20a8-43e7-828e-4cf38d906187',
        ],
        mnmp: [
          '2fcd4161-e08f-4eea-818b-703ea3ec6389',
          'c6785d63-6e5f-42c2-839d-5edf139b7c19',
          'bc6ef6f2-ecce-4328-96a2-002de41a144d',
          '72058ad1-68a1-45f6-a8e8-10621ffc7288',
          '18593052-c021-4158-860d-d8122981a0ac',
          '4207025c-9b00-4bea-a36c-6fbf2d3c215e',
          '0ec4702d-b5e5-4c60-91e9-6fa6a836f0d1',
          '41258219-b129-4fad-a629-f244826281f8',
          'e73bc63d-561a-4acd-a0c4-d5f70c4603df',
          'ddf882b7-be26-4a93-8144-0aeb35122651',
          '602936f5-98a3-4f8c-9471-cf389a519f4b',
          '8b300988-62cc-4bc6-9ee0-9194f3f78e27',
          '6ab60531-fb6f-478c-9063-82f2b0af2bed',
          '802a5994-a03c-44b8-a650-47c0f71c2e48',
          '6070b400-5c10-4c5e-b5c5-a5bd9be6d321',
          '3193df5f-2a34-4fe3-816e-6b05999aa5ce',
          '994e68cd-d607-40e6-a54c-02a51caa17e0',
        ],
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

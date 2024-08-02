/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { ElasticsearchClient } from '@kbn/core/server';
import { LogstashAgentMonitoring } from './logstash_agent_monitoring';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logstashStatsResultSetOfAgentMonitoring = require('./__mocks__/fixtures/logstash_stats_agent_monitoring_results.json');

const logstashStateResultsMapOfAgentMonitoring = new Map();

// Load data for state results.
['1n1p', '1nmp', 'mnmp'].forEach((data) => {
  logstashStateResultsMapOfAgentMonitoring.set(
    data,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(`./__mocks__/fixtures/logstash_state_agent_monitoring_results_${data}`)
  );
});

const getBaseOptions = () => ({
  clusters: {},
  allHostIds: {},
  allEphemeralIds: {},
  versions: {},
  plugins: {},
});

describe('LogstashAgentMonitoring', () => {
  let agentMonitoring: LogstashAgentMonitoring;
  const monitoringClusterUuid: string = 'monitoringClusterUuid';
  const searchMock = sinon.stub();
  const callCluster = { search: searchMock } as unknown as ElasticsearchClient;
  const start = '2024-05-31T00:00:00.000Z';
  const end = '2024-05-31T00:20:00.000Z';

  beforeEach(() => {
    agentMonitoring = new LogstashAgentMonitoring();
    searchMock.returns(Promise.resolve({}));
  });

  afterEach(() => {
    searchMock.reset();
  });

  describe('Logstash agent monitoring query test', () => {
    const clusterUuid = 'a';
    const hostIds = ['aHost', 'bHost', 'cHost'];

    it('creates proper query for stats', async () => {
      const expectedQuery = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'data_stream.dataset': 'logstash.node' } }],
              },
            },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: 1717113600000,
                  lte: 1717114800000,
                },
              },
            },
          ],
        },
      };

      await (agentMonitoring as any).fetchLogstashStats(
        callCluster,
        monitoringClusterUuid,
        start,
        end,
        {} as any
      );
      const { args } = searchMock.firstCall;
      const [{ body }] = args;

      expect(body.from).toEqual(0);
      expect(body.size).toEqual(10000);
      expect(body.query).toEqual(expectedQuery);
    });

    it('creates the logstash state query correctly for state', async () => {
      const expected = {
        bool: {
          filter: [
            {
              bool: {
                should: [{ term: { 'data_stream.dataset': 'logstash.plugins' } }],
              },
            },
            {
              terms: {
                'host.id': ['aHost', 'bHost', 'cHost'],
              },
            },
            {
              range: {
                '@timestamp': {
                  format: 'epoch_millis',
                  gte: 1717113600000,
                  lte: 1717114800000,
                },
              },
            },
          ],
        },
      };

      await (agentMonitoring as any).fetchLogstashState(
        callCluster,
        hostIds,
        clusterUuid,
        start,
        end,
        {} as any
      );
      const { args } = searchMock.firstCall;
      const [{ body }] = args;
      expect(body.query).toEqual(expected);
    });
  });

  describe('Process query results', () => {
    it('summarizes empty results', () => {
      const resultsEmpty = undefined;
      const options = getBaseOptions();
      (agentMonitoring as any).processStatsResults(
        resultsEmpty as any,
        options,
        monitoringClusterUuid
      );

      expect(options.clusters).toStrictEqual({});
    });

    it('summarizes a result with monitoring cluster UUID', () => {
      const source = {
        logstash: {
          node: {
            stats: {
              logstash: {
                pipeline: {
                  batch_delay: 50,
                  batch_size: 125,
                  workers: 10,
                },
                pipelines: ['another_test', 'test'],
                ephemeral_id: '224e3687-15b2-4e91-84bb-dbb785742c73',
                uuid: 'a755552f-9ef8-4f01-abae-394a59352f2d',
                version: '8.15.0',
                status: 'green',
              },
            },
          },
        },
        input: {
          type: 'cel',
        },
        agent: {
          name: 'Mashhurs.local',
          id: 'ef37141b-605e-4b6e-a69f-ec525f8dcdd4',
          type: 'filebeat',
        },
        '@timestamp': '2024-06-03T16:55:30.213Z',
        data_stream: {
          namespace: 'default',
          type: 'metrics',
          dataset: 'logstash.node',
        },
        host: {
          id: '6F56EC02-BC0B-50C7-A3C4-A414CB348C79',
        },
      };

      const results = {
        hits: {
          hits: [
            {
              _source: source,
            },
          ],
        },
      };

      const options = getBaseOptions();
      (agentMonitoring as any).processStatsResults(
        results as any,
        options,
        'FlV4ckTxQ0a78hmBkzzc9A'
      );

      expect(options.clusters).toStrictEqual({
        FlV4ckTxQ0a78hmBkzzc9A: {
          count: 1,
          cluster_stats: {
            collection_types: {
              filebeat: 1,
            },
            monitoringClusterUuid: 'FlV4ckTxQ0a78hmBkzzc9A',
            pipelines: {
              count: 2,
            },
            plugins: [],
          },
          versions: [
            {
              count: 1,
              version: '8.15.0',
            },
          ],
        },
      });
    });

    it('summarizes a result with reported cluster UUID', () => {
      const source = {
        logstash: {
          node: {
            stats: {
              logstash: {
                pipeline: {
                  batch_delay: 50,
                  batch_size: 125,
                  workers: 10,
                },
                pipelines: ['another_test', 'test'],
                ephemeral_id: '224e3687-15b2-4e91-84bb-dbb785742c73',
                uuid: 'a755552f-9ef8-4f01-abae-394a59352f2d',
                version: '8.15.0',
                status: 'green',
              },
            },
          },
          elasticsearch: {
            cluster: {
              id: ['testClusterUuid'],
            },
          },
        },
        input: {
          type: 'cel',
        },
        agent: {
          name: 'Mashhurs.local',
          id: 'ef37141b-605e-4b6e-a69f-ec525f8dcdd4',
          type: 'filebeat',
        },
        '@timestamp': '2024-06-03T16:55:30.213Z',
        data_stream: {
          namespace: 'default',
          type: 'metrics',
          dataset: 'logstash.node',
        },
        host: {
          id: '6F56EC02-BC0B-50C7-A3C4-A414CB348C79',
        },
      };

      const results = {
        hits: {
          hits: [
            {
              _source: source,
            },
          ],
        },
      };

      const options = getBaseOptions();
      (agentMonitoring as any).processStatsResults(
        results as any,
        options,
        'FlV4ckTxQ0a78hmBkzzc9A'
      );

      expect(options.clusters).toStrictEqual({
        testClusterUuid: {
          count: 1,
          cluster_stats: {
            collection_types: {
              filebeat: 1,
            },
            monitoringClusterUuid: 'FlV4ckTxQ0a78hmBkzzc9A',
            pipelines: {
              count: 2,
            },
            plugins: [],
          },
          versions: [
            {
              count: 1,
              version: '8.15.0',
            },
          ],
        },
      });
    });

    it('retrieves all host ids from the hits for the same cluster', () => {
      const source1 = {
        logstash: {
          node: {
            stats: {
              logstash: {
                pipeline: {
                  batch_delay: 50,
                  batch_size: 125,
                  workers: 10,
                },
                pipelines: ['another_test', 'test'],
                ephemeral_id: '224e3687-15b2-4e91-84bb-dbb785742c73',
                uuid: 'a755552f-9ef8-4f01-abae-394a59352f2d',
                version: '8.15.0',
                status: 'green',
              },
            },
          },
          elasticsearch: {
            cluster: {
              id: ['testClusterUuid'],
            },
          },
        },
        host: {
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        },
      };

      const source2 = {
        logstash: {
          node: {
            stats: {
              logstash: {
                pipeline: {
                  batch_delay: 50,
                  batch_size: 125,
                  workers: 10,
                },
                pipelines: ['another_test', 'test'],
                ephemeral_id: '224e3687-15b2-4e91-84bb-dbb785742c73',
                uuid: 'a755552f-9ef8-4f01-abae-394a59352f2d',
                version: '8.15.0',
                status: 'green',
              },
            },
          },
          elasticsearch: {
            cluster: {
              id: ['testClusterUuid'],
            },
          },
        },
        host: {
          id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        },
      };

      const source3 = {
        logstash: {
          node: {
            stats: {
              logstash: {
                pipeline: {
                  batch_delay: 50,
                  batch_size: 125,
                  workers: 10,
                },
                pipelines: ['another_test', 'test'],
                ephemeral_id: '224e3687-15b2-4e91-84bb-dbb785742c73',
                uuid: 'a755552f-9ef8-4f01-abae-394a59352f2d',
                version: '8.15.0',
                status: 'green',
              },
            },
          },
          elasticsearch: {
            cluster: {
              id: ['3'],
            },
          },
        },
        host: {
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        },
      };

      const results = {
        hits: {
          hits: [
            {
              _source: source1,
            },
            {
              _source: source2,
            },
            {
              _source: source3,
            },
          ],
        },
      };

      const options = getBaseOptions();
      (agentMonitoring as any).processStatsResults(results as any, options, monitoringClusterUuid);

      expect(options.allHostIds).toStrictEqual({
        testClusterUuid: [
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        ],
        '3': ['cccccccc-cccc-cccc-cccc-cccccccccccc'],
      });

      expect(options.clusters).toStrictEqual({
        testClusterUuid: {
          count: 2,
          cluster_stats: {
            plugins: [],
            collection_types: {
              agent: 2,
            },
            monitoringClusterUuid: 'monitoringClusterUuid',
            pipelines: {
              count: 2,
            },
          },
          versions: [
            {
              count: 2,
              version: '8.15.0',
            },
          ],
        },
        '3': {
          count: 1,
          cluster_stats: {
            plugins: [],
            collection_types: {
              agent: 1,
            },
            monitoringClusterUuid: 'monitoringClusterUuid',
            pipelines: {
              count: 2,
            },
          },
          versions: [
            {
              count: 1,
              version: '8.15.0',
            },
          ],
        },
      });
    });

    it('summarizes stats from hits across multiple result objects', () => {
      const options = getBaseOptions();

      // logstashStatsResultSet is an array of many small query results
      logstashStatsResultSetOfAgentMonitoring.forEach((results: any) => {
        (agentMonitoring as any).processStatsResults(results, options, monitoringClusterUuid);
      });

      logstashStateResultsMapOfAgentMonitoring.forEach((value: string[], clusterUuid: string) => {
        value.forEach((results: any) => {
          (agentMonitoring as any).processStateResults(results, options, monitoringClusterUuid);
        });
      });

      expect(options.allHostIds).toStrictEqual({
        '1n1p': ['cf37c6fa-2f1a-41e2-9a89-36b420a8b9a5'],
        '1nmp': ['47a70feb-3cb5-4618-8670-2c0bada61acd', '5a65d966-0330-4bd7-82f2-ee81040c13cf'],
        mnmp: [
          '2fcd4161-e08f-4eea-818b-703ea3ec6389',
          'c6785d63-6e5f-42c2-839d-5edf139b7c19',
          'bc6ef6f2-ecce-4328-96a2-002de41a144d',
        ],
      });

      expect(options.clusters).toStrictEqual({
        '1n1p': {
          cluster_stats: {
            collection_types: {
              filebeat: 1,
            },
            monitoringClusterUuid: 'monitoringClusterUuid',
            pipelines: {
              count: 2,
            },
            plugins: [
              {
                count: 1,
                name: 'logstash-input-generator',
              },
              {
                count: 1,
                name: 'logstash-input-heartbeat',
              },
              {
                count: 1,
                name: 'logstash-codec-dots',
              },
            ],
          },
          count: 1,
          versions: [
            {
              count: 1,
              version: '8.15.0',
            },
          ],
        },
        '1nmp': {
          cluster_stats: {
            collection_types: {
              filebeat: 2,
            },
            monitoringClusterUuid: 'monitoringClusterUuid',
            pipelines: {
              count: 2,
            },
            plugins: [
              {
                count: 2,
                name: 'logstash-codec-plain',
              },
            ],
          },
          count: 2,
          versions: [
            {
              count: 2,
              version: '8.15.0',
            },
          ],
        },
        mnmp: {
          cluster_stats: {
            collection_types: {
              filebeat: 3,
            },
            monitoringClusterUuid: 'monitoringClusterUuid',
            pipelines: {
              count: 2,
            },
            plugins: [
              {
                count: 1,
                name: 'logstash-codec-plain',
              },
              {
                count: 1,
                name: 'logstash-codec-rubydebug',
              },
              {
                count: 1,
                name: 'logstash-output-stdout',
              },
            ],
          },
          count: 3,
          versions: [
            {
              count: 3,
              version: '8.15.0',
            },
          ],
        },
      });
    });
  });
});

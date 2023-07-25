/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { fetchCpuUsageNodeStats } from './fetch_cpu_usage_node_stats';

describe('fetchCpuUsageNodeStats', () => {
  describe('when running outside a container', () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

    const configSlice: any = {
      ui: {
        ccs: { enabled: false },
        container: {
          elasticsearch: {
            enabled: false,
          },
        },
        max_bucket_size: 10,
      },
    };

    const filterQuery = {
      bool: {
        should: [
          {
            term: {
              cluster_uuid: {
                value: 'my-test-cluster',
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    it('calculates the CPU usage', async () => {
      esClient.search.mockResponse({
        aggregations: {
          clusters: {
            buckets: [
              {
                key: 'my-test-cluster',
                nodes: {
                  buckets: [
                    {
                      key: 'my-test-node',
                      average_cpu: {
                        value: 45,
                      },
                      quota_micros_max: {
                        value: null,
                      },
                      quota_micros_min: {
                        value: null,
                      },
                      name: {
                        buckets: [
                          {
                            key: 'test-node',
                          },
                        ],
                      },
                      index: {
                        buckets: [
                          {
                            key: 'a-local-index',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as any);

      const stats = await fetchCpuUsageNodeStats(
        {
          esClient,
          clusterUuids: ['my-test-cluster'],
          startMs: 0,
          endMs: 10,
          filterQuery,
          logger: loggerMock.create(),
        },
        configSlice
      );

      expect(stats).toEqual([
        {
          clusterUuid: 'my-test-cluster',
          nodeId: 'my-test-node',
          nodeName: 'test-node',
          ccs: undefined,
          cpuUsage: 45,
          unexpectedLimits: false,
        },
      ]);

      // If this check fails, it means the query has changed which `might` mean the response shape has changed and
      // the test data needs to be updated to reflect the new format.
      expect(esClient.search.mock.calls[0][0]).toMatchSnapshot();
    });

    it('warns about container metrics being present', async () => {
      esClient.search.mockResponse({
        aggregations: {
          clusters: {
            buckets: [
              {
                key: 'my-test-cluster',
                nodes: {
                  buckets: [
                    {
                      key: 'my-test-node',
                      average_cpu: {
                        value: 45,
                      },
                      quota_micros_max: {
                        value: -1,
                      },
                      quota_micros_min: {
                        value: -1,
                      },
                      name: {
                        buckets: [
                          {
                            key: 'test-node',
                          },
                        ],
                      },
                      index: {
                        buckets: [
                          {
                            key: 'a-local-index',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as any);

      const stats = await fetchCpuUsageNodeStats(
        {
          esClient,
          clusterUuids: ['my-test-cluster'],
          startMs: 0,
          endMs: 10,
          filterQuery,
          logger: loggerMock.create(),
        },
        configSlice
      );

      expect(stats).toEqual([
        {
          unexpectedLimits: true,
          clusterUuid: 'my-test-cluster',
          nodeId: 'my-test-node',
          nodeName: 'test-node',
          ccs: undefined,
          cpuUsage: 45,
        },
      ]);
    });
  });

  describe('when running in a container', () => {
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;

    const configSlice: any = {
      ui: {
        ccs: { enabled: false },
        container: {
          elasticsearch: {
            enabled: true,
          },
        },
        max_bucket_size: 10,
      },
    };

    const filterQuery = {
      bool: {
        should: [
          {
            term: {
              cluster_uuid: {
                value: 'my-test-cluster',
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    };

    it('calculates the containerized CPU usage', async () => {
      // 45% CPU usage
      const maxPeriods = 1000;
      const quotaMicros = 100000;
      const usageLimitNanos = maxPeriods * quotaMicros * 1000;
      const maxUsageNanos = 0.45 * usageLimitNanos;

      esClient.search.mockResponse({
        aggregations: {
          clusters: {
            buckets: [
              {
                key: 'my-test-cluster',
                nodes: {
                  buckets: [
                    {
                      key: 'my-test-node',
                      min_usage_nanos: {
                        value: 0,
                      },
                      max_usage_nanos: {
                        value: maxUsageNanos,
                      },
                      min_periods: {
                        value: 0,
                      },
                      max_periods: {
                        value: maxPeriods,
                      },
                      quota_micros_min: {
                        value: quotaMicros,
                      },
                      quota_micros_max: {
                        value: quotaMicros,
                      },
                      average_cpu_usage_percent: {
                        value: 45,
                      },
                      name: {
                        buckets: [
                          {
                            key: 'test-node',
                          },
                        ],
                      },
                      index: {
                        buckets: [
                          {
                            key: 'a-local-index',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as any);

      const stats = await fetchCpuUsageNodeStats(
        {
          esClient,
          clusterUuids: ['my-test-cluster'],
          startMs: 0,
          endMs: 10,
          filterQuery,
          logger: loggerMock.create(),
        },
        configSlice
      );

      expect(stats).toEqual([
        {
          clusterUuid: 'my-test-cluster',
          nodeId: 'my-test-node',
          nodeName: 'test-node',
          ccs: undefined,
          cpuUsage: 45,
        },
      ]);

      // If this check fails, it means the query has changed which `might` mean the response shape has changed and
      // the test data needs to be updated to reflect the new format.
      expect(esClient.search.mock.calls[0][0]).toMatchSnapshot();
    });

    it('warns about resource usage limits not being set', async () => {
      esClient.search.mockResponse({
        aggregations: {
          clusters: {
            buckets: [
              {
                key: 'my-test-cluster',
                nodes: {
                  buckets: [
                    {
                      key: 'my-test-node',
                      min_usage_nanos: {
                        value: 0,
                      },
                      max_usage_nanos: {
                        value: 1000,
                      },
                      min_periods: {
                        value: 0,
                      },
                      max_periods: {
                        value: 100,
                      },
                      quota_micros_min: {
                        value: -1,
                      },
                      quota_micros_max: {
                        value: -1,
                      },
                      average_cpu_usage_percent: {
                        value: 45,
                      },
                      name: {
                        buckets: [
                          {
                            key: 'test-node',
                          },
                        ],
                      },
                      index: {
                        buckets: [
                          {
                            key: 'a-local-index',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as any);

      const stats = await fetchCpuUsageNodeStats(
        {
          esClient,
          clusterUuids: ['my-test-cluster'],
          startMs: 0,
          endMs: 10,
          filterQuery,
          logger: loggerMock.create(),
        },
        configSlice
      );

      expect(stats).toEqual([
        {
          missingLimits: true,
          clusterUuid: 'my-test-cluster',
          nodeId: 'my-test-node',
          nodeName: 'test-node',
          ccs: undefined,
          cpuUsage: 45,
        },
      ]);
    });

    it('warns about resource usage limits being changed', async () => {
      esClient.search.mockResponse({
        aggregations: {
          clusters: {
            buckets: [
              {
                key: 'my-test-cluster',
                nodes: {
                  buckets: [
                    {
                      key: 'my-test-node',
                      min_usage_nanos: {
                        value: 0,
                      },
                      max_usage_nanos: {
                        value: 1000,
                      },
                      min_periods: {
                        value: 0,
                      },
                      max_periods: {
                        value: 100,
                      },
                      quota_micros_min: {
                        value: -1,
                      },
                      quota_micros_max: {
                        value: 10000,
                      },
                      average_cpu_usage_percent: {
                        value: 45,
                      },
                      name: {
                        buckets: [
                          {
                            key: 'test-node',
                          },
                        ],
                      },
                      index: {
                        buckets: [
                          {
                            key: 'a-local-index',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as any);

      const stats = await fetchCpuUsageNodeStats(
        {
          esClient,
          clusterUuids: ['my-test-cluster'],
          startMs: 0,
          endMs: 10,
          filterQuery,
          logger: loggerMock.create(),
        },
        configSlice
      );

      expect(stats).toEqual([
        {
          limitsChanged: true,
          clusterUuid: 'my-test-cluster',
          nodeId: 'my-test-node',
          nodeName: 'test-node',
          ccs: undefined,
          cpuUsage: undefined,
        },
      ]);
    });

    it('warns about failing to compute usage due to values missing', async () => {
      esClient.search.mockResponse({
        aggregations: {
          clusters: {
            buckets: [
              {
                key: 'my-test-cluster',
                nodes: {
                  buckets: [
                    {
                      key: 'my-test-node',
                      min_usage_nanos: {
                        value: null,
                      },
                      max_usage_nanos: {
                        value: null,
                      },
                      min_periods: {
                        value: null,
                      },
                      max_periods: {
                        value: null,
                      },
                      quota_micros_min: {
                        value: 10000,
                      },
                      quota_micros_max: {
                        value: 10000,
                      },
                      average_cpu_usage_percent: {
                        value: 45,
                      },
                      name: {
                        buckets: [
                          {
                            key: 'test-node',
                          },
                        ],
                      },
                      index: {
                        buckets: [
                          {
                            key: 'a-local-index',
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as any);

      const stats = await fetchCpuUsageNodeStats(
        {
          esClient,
          clusterUuids: ['my-test-cluster'],
          startMs: 0,
          endMs: 10,
          filterQuery,
          logger: loggerMock.create(),
        },
        configSlice
      );

      expect(stats).toEqual([
        {
          clusterUuid: 'my-test-cluster',
          nodeId: 'my-test-node',
          nodeName: 'test-node',
          ccs: undefined,
          cpuUsage: undefined,
        },
      ]);
    });
  });
});

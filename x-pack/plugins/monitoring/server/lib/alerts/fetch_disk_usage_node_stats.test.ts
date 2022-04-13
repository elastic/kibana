/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { fetchDiskUsageNodeStats } from './fetch_disk_usage_node_stats';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true, remotePatterns: '*' },
        },
      },
    },
  },
}));
import { Globals } from '../../static_globals';

describe('fetchDiskUsageNodeStats', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

  const clusters = [
    {
      clusterUuid: 'cluster123',
      clusterName: 'test-cluster',
    },
  ];
  const duration = '5m';
  const size = 10;

  const esRes = {
    aggregations: {
      clusters: {
        buckets: [
          {
            key: clusters[0].clusterUuid,
            nodes: {
              buckets: [
                {
                  key: 'theNodeId',
                  index: {
                    buckets: [
                      {
                        key: '.monitoring-es-*',
                      },
                    ],
                  },
                  name: {
                    buckets: [
                      {
                        key: 'theNodeName',
                      },
                    ],
                  },
                  usage_ratio_percentile: {
                    value: 10,
                  },
                },
              ],
            },
          },
        ],
      },
    },
  };
  it('fetch normal stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      esRes
    );

    const result = await fetchDiskUsageNodeStats(esClient, clusters, duration, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        nodeName: 'theNodeName',
        nodeId: 'theNodeId',
        diskUsage: 10,
        ccs: null,
      },
    ]);
  });
  it('should call ES with correct query', async () => {
    await fetchDiskUsageNodeStats(esClient, clusters, duration, size);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.node_stats-*,metrics-elasticsearch.node_stats-*',
      filter_path: ['aggregations'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['cluster123'] } },
              {
                bool: {
                  should: [
                    { term: { type: 'node_stats' } },
                    { term: { 'metricset.name': 'node_stats' } },
                    { term: { 'data_stream.dataset': 'elasticsearch.node_stats' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { gte: 'now-5m' } } },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: { field: 'cluster_uuid', size: 10, include: ['cluster123'] },
            aggs: {
              nodes: {
                terms: { field: 'node_stats.node_id', size: 10 },
                aggs: {
                  index: { terms: { field: '_index', size: 1 } },
                  total_in_bytes: { max: { field: 'node_stats.fs.total.total_in_bytes' } },
                  available_in_bytes: { max: { field: 'node_stats.fs.total.available_in_bytes' } },
                  usage_ratio_percentile: {
                    bucket_script: {
                      buckets_path: {
                        available_in_bytes: 'available_in_bytes',
                        total_in_bytes: 'total_in_bytes',
                      },
                      script:
                        '100 - Math.floor((params.available_in_bytes / params.total_in_bytes) * 100)',
                    },
                  },
                  name: { terms: { field: 'source_node.name', size: 1 } },
                },
              },
            },
          },
        },
      },
    });
  });
  it('should call ES with correct query when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });
    await fetchDiskUsageNodeStats(esClient, clusters, duration, size);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.node_stats-*');
  });
  it('should call ES with correct query when ccs enabled and monitoring.ui.ccs.remotePatterns has array value', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = true;
    Globals.app.config.ui.ccs.remotePatterns = ['remote1', 'remote2'];
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });
    await fetchDiskUsageNodeStats(esClient, clusters, duration, size);
    // @ts-ignore
    expect(params.index).toBe(
      'remote1:.monitoring-es-*,remote2:.monitoring-es-*,remote1:metrics-elasticsearch.node_stats-*,remote2:metrics-elasticsearch.node_stats-*'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { fetchMemoryUsageNodeStats } from './fetch_memory_usage_node_stats';

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

describe('fetchMemoryUsageNodeStats', () => {
  const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'abc123',
      clusterName: 'test',
    },
  ];
  const startMs = 0;
  const endMs = 0;
  const size = 10;

  const esRes = {
    aggregations: {
      clusters: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'NG2d5jHiSBGPE6HLlUN2Bg',
            doc_count: 30,
            nodes: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: 'qrLmmSBMSXGSfciYLjL3GA',
                  doc_count: 30,
                  cluster_uuid: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: 'NG2d5jHiSBGPE6HLlUN2Bg',
                        doc_count: 30,
                      },
                    ],
                  },
                  avg_heap: {
                    value: 46.3,
                  },
                  name: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: 'desktop-dca-192-168-162-170.endgames.local',
                        doc_count: 30,
                      },
                    ],
                  },
                  index: {
                    doc_count_error_upper_bound: 0,
                    sum_other_doc_count: 0,
                    buckets: [
                      {
                        key: '.monitoring-es-7-2022.01.27',
                        doc_count: 30,
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
  };

  it('fetch stats', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      esRes
    );
    const result = await fetchMemoryUsageNodeStats(esClient, clusters, startMs, endMs, size);
    expect(result).toEqual([
      {
        memoryUsage: 46,
        clusterUuid: 'NG2d5jHiSBGPE6HLlUN2Bg',
        nodeId: 'qrLmmSBMSXGSfciYLjL3GA',
        nodeName: 'desktop-dca-192-168-162-170.endgames.local',
        ccs: null,
      },
    ]);
  });

  it('should call ES with correct query', async () => {
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });
    await fetchMemoryUsageNodeStats(esClient, clusters, startMs, endMs, size);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.node_stats-*,metrics-elasticsearch.node_stats-*',
      filter_path: ['aggregations'],
      body: {
        size: 0,
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['abc123'] } },
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
              { range: { timestamp: { format: 'epoch_millis', gte: 0, lte: 0 } } },
            ],
          },
        },
        aggs: {
          clusters: {
            terms: { field: 'cluster_uuid', size: 10 },
            aggs: {
              nodes: {
                terms: { field: 'source_node.uuid', size: 10 },
                aggs: {
                  index: { terms: { field: '_index', size: 1 } },
                  avg_heap: { avg: { field: 'node_stats.jvm.mem.heap_used_percent' } },
                  cluster_uuid: { terms: { field: 'cluster_uuid', size: 1 } },
                  name: { terms: { field: 'source_node.name', size: 1 } },
                },
              },
            },
          },
        },
      },
    });
  });
  it('should call ES with correct query  when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve(esRes as any);
    });
    await fetchMemoryUsageNodeStats(esClient, clusters, startMs, endMs, size);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.node_stats-*');
  });
});

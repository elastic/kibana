/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchKibanaVersions } from './fetch_kibana_versions';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));
import { Globals } from '../../static_globals';

describe('fetchKibanaVersions', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'cluster123',
      clusterName: 'test-cluster',
    },
  ];
  const index = '.monitoring-kibana-*';
  const size = 10;

  it('fetch as expected', async () => {
    esClient.search.mockResponse(
      // @ts-expect-error not full response interface
      {
        aggregations: {
          index: {
            buckets: [
              {
                key: `Monitoring:${index}`,
              },
            ],
          },
          cluster: {
            buckets: [
              {
                key: 'cluster123',
                group_by_kibana: {
                  buckets: [
                    {
                      group_by_version: {
                        buckets: [
                          {
                            key: '8.0.0',
                          },
                        ],
                      },
                    },
                    {
                      group_by_version: {
                        buckets: [
                          {
                            key: '7.2.1',
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
      }
    );

    const result = await fetchKibanaVersions(esClient, clusters, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        ccs: 'Monitoring',
        versions: ['8.0.0', '7.2.1'],
      },
    ]);
  });
  it('should call ES with correct query', async () => {
    await fetchKibanaVersions(esClient, clusters, size);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-kibana-*,.monitoring-kibana-*,*:metrics-kibana.stats-*,metrics-kibana.stats-*',
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
                    { term: { type: 'kibana_stats' } },
                    { term: { 'metricset.name': 'stats' } },
                    { term: { 'data_stream.dataset': 'kibana.stats' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { gte: 'now-2m' } } },
            ],
          },
        },
        aggs: {
          index: { terms: { field: '_index', size: 1 } },
          cluster: {
            terms: { field: 'cluster_uuid', size: 1 },
            aggs: {
              group_by_kibana: {
                terms: { field: 'kibana_stats.kibana.uuid', size: 10 },
                aggs: {
                  group_by_version: {
                    terms: {
                      field: 'kibana_stats.kibana.version',
                      size: 1,
                      order: { latest_report: 'desc' },
                    },
                    aggs: { latest_report: { max: { field: 'timestamp' } } },
                  },
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
      return Promise.resolve({} as any);
    });
    await fetchKibanaVersions(esClient, clusters, size);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-kibana-*,metrics-kibana.stats-*');
  });
});

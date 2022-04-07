/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fetchLicenses } from './fetch_licenses';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

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

describe('fetchLicenses', () => {
  const clusterName = 'MyCluster';
  const clusterUuid = 'clusterA';
  const license = {
    status: 'active',
    expiry_date_in_millis: 1579532493876,
    type: 'basic',
  };

  it('return a list of licenses', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse({
      hits: {
        hits: [
          {
            _source: {
              license,
              cluster_uuid: clusterUuid,
            },
          },
        ],
      },
    } as any);
    const clusters = [{ clusterUuid, clusterName }];
    const result = await fetchLicenses(esClient, clusters);
    expect(result).toEqual([
      {
        status: license.status,
        type: license.type,
        expiryDateMS: license.expiry_date_in_millis,
        clusterUuid,
      },
    ]);
  });

  it('should only search for the clusters provided', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    const clusters = [{ clusterUuid, clusterName }];
    await fetchLicenses(esClient, clusters);
    const params = esClient.search.mock.calls[0][0] as any;
    expect(params?.body?.query.bool.filter[0].terms.cluster_uuid).toEqual([clusterUuid]);
  });

  it('should limit the time period in the query', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    const clusters = [{ clusterUuid, clusterName }];
    await fetchLicenses(esClient, clusters);
    const params = esClient.search.mock.calls[0][0] as any;
    expect(params?.body?.query.bool.filter[2].range.timestamp.gte).toBe('now-2m');
  });
  it('should call ES with correct query', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as any);
    });
    const clusters = [{ clusterUuid, clusterName }];
    await fetchLicenses(esClient, clusters);
    expect(params).toStrictEqual({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.cluster_stats-*,metrics-elasticsearch.cluster_stats-*',
      filter_path: [
        'hits.hits._source.license.*',
        'hits.hits._source.elasticsearch.cluster.stats.license.*',
        'hits.hits._source.cluster_uuid',
        'hits.hits._source.elasticsearch.cluster.id',
        'hits.hits._index',
      ],
      body: {
        size: 1,
        sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['clusterA'] } },
              {
                bool: {
                  should: [
                    { term: { type: 'cluster_stats' } },
                    { term: { 'metricset.name': 'cluster_stats' } },
                    { term: { 'data_stream.dataset': 'elasticsearch.cluster_stats' } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { range: { timestamp: { gte: 'now-2m' } } },
            ],
          },
        },
        collapse: { field: 'cluster_uuid' },
      },
    });
  });
  it('should call ES with correct query  when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as any);
    });
    const clusters = [{ clusterUuid, clusterName }];
    await fetchLicenses(esClient, clusters);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.cluster_stats-*');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { fetchClusters } from './fetch_clusters';

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

describe('fetchClusters', () => {
  const clusterUuid = '1sdfds734';
  const clusterName = 'monitoring';

  it('return a list of clusters', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse({
      hits: {
        hits: [
          {
            _source: {
              cluster_uuid: clusterUuid,
              cluster_name: clusterName,
            },
          },
        ],
      },
    } as estypes.SearchResponse);

    const result = await fetchClusters(esClient);
    expect(result).toEqual([{ clusterUuid, clusterName }]);
  });

  it('return the metadata name if available', async () => {
    const metadataName = 'custom-monitoring';
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse({
      hits: {
        hits: [
          {
            _source: {
              cluster_uuid: clusterUuid,
              cluster_name: clusterName,
              cluster_settings: {
                cluster: {
                  metadata: {
                    display_name: metadataName,
                  },
                },
              },
            },
          },
        ],
      },
    } as estypes.SearchResponse);
    const result = await fetchClusters(esClient);
    expect(result).toEqual([{ clusterUuid, clusterName: metadataName }]);
  });

  it('should limit the time period in the query', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    await fetchClusters(esClient);
    const params = esClient.search.mock.calls[0][0] as any;
    expect(params?.body?.query.bool.filter[1].range.timestamp.gte).toBe('now-2m');
  });

  it('should call ES with correct query', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    await fetchClusters(esClient);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.cluster_stats-*,metrics-elasticsearch.cluster_stats-*',
      filter_path: [
        'hits.hits._source.cluster_settings.cluster.metadata.display_name',
        'hits.hits._source.cluster_uuid',
        'hits.hits._source.elasticsearch.cluster.id',
        'hits.hits._source.cluster_name',
        'hits.hits._source.elasticsearch.cluster.name',
      ],
      body: {
        size: 1000,
        query: {
          bool: {
            filter: [
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
  it('should call ES with correct query when ccs disabled', async () => {
    // @ts-ignore
    Globals.app.config.ui.ccs.enabled = false;
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    let params = null;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as any);
    });
    await fetchClusters(esClient);
    // @ts-ignore
    expect(params.index).toBe('.monitoring-es-*,metrics-elasticsearch.cluster_stats-*');
  });
});

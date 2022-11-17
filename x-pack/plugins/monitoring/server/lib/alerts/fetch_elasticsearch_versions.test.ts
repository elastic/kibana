/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchElasticsearchVersions } from './fetch_elasticsearch_versions';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Globals } from '../../static_globals';

const getConfig = (ccsEnabled: boolean) =>
  ({
    config: {
      ui: {
        ccs: { enabled: ccsEnabled },
      },
    },
  } as Partial<typeof Globals.app> as typeof Globals.app);

describe('fetchElasticsearchVersions', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

  const clusters = [
    {
      clusterUuid: 'cluster123',
      clusterName: 'test-cluster',
    },
  ];
  const index = '.monitoring-es-*';
  const size = 10;
  const versions = ['8.0.0', '7.2.1'];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Globals, 'app', 'get').mockReturnValue(getConfig(true));
  });

  it('fetch as expected', async () => {
    esClient.search.mockResponse({
      hits: {
        hits: [
          {
            _index: `Monitoring:${index}`,
            _source: {
              cluster_uuid: 'cluster123',
              cluster_stats: {
                nodes: {
                  versions,
                },
              },
            },
          },
        ],
      },
    } as estypes.SearchResponse);

    const result = await fetchElasticsearchVersions(esClient, clusters, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        ccs: 'Monitoring',
        versions,
      },
    ]);
  });
  it('should call ES with correct query', async () => {
    await fetchElasticsearchVersions(esClient, clusters, size);
    expect(esClient.search).toHaveBeenCalledWith({
      index:
        '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.stack_monitoring.cluster_stats-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*',
      filter_path: [
        'hits.hits._source.cluster_stats.nodes.versions',
        'hits.hits._source.elasticsearch.cluster.stats.nodes.versions',
        'hits.hits._index',
        'hits.hits._source.cluster_uuid',
        'hits.hits._source.elasticsearch.cluster.id',
      ],
      body: {
        size: 1,
        sort: [{ timestamp: { order: 'desc', unmapped_type: 'long' } }],
        query: {
          bool: {
            filter: [
              { terms: { cluster_uuid: ['cluster123'] } },
              {
                bool: {
                  should: [
                    { term: { type: 'cluster_stats' } },
                    { term: { 'metricset.name': 'cluster_stats' } },
                    {
                      term: {
                        'data_stream.dataset': 'elasticsearch.stack_monitoring.cluster_stats',
                      },
                    },
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
    jest.spyOn(Globals, 'app', 'get').mockReturnValue(getConfig(false));

    let params: estypes.SearchRequest | undefined;
    esClient.search.mockImplementation((...args) => {
      params = args[0];
      return Promise.resolve({} as estypes.SearchResponse);
    });
    await fetchElasticsearchVersions(esClient, clusters, size);
    expect(params?.index).toBe(
      '.monitoring-es-*,metrics-elasticsearch.stack_monitoring.cluster_stats-*'
    );
  });
});

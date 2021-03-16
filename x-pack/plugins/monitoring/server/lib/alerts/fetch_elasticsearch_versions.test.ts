/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { fetchElasticsearchVersions } from './fetch_elasticsearch_versions';

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

  it('fetch as expected', async () => {
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );

    const result = await fetchElasticsearchVersions(esClient, clusters, index, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        ccs: 'Monitoring',
        versions,
      },
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchKibanaVersions } from './fetch_kibana_versions';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';

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
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
    );

    const result = await fetchKibanaVersions(esClient, clusters, index, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        ccs: 'Monitoring',
        versions: ['8.0.0', '7.2.1'],
      },
    ]);
  });
});

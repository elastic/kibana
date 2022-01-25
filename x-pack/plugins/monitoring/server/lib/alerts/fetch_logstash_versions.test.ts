/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchLogstashVersions } from './fetch_logstash_versions';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
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

describe('fetchLogstashVersions', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
  const clusters = [
    {
      clusterUuid: 'cluster123',
      clusterName: 'test-cluster',
    },
  ];
  const index = '.monitoring-logstash-*';
  const size = 10;

  it('fetch as expected', async () => {
    esClient.search.mockReturnValue(
      // @ts-expect-error not full response interface
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
                group_by_logstash: {
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

    const result = await fetchLogstashVersions(esClient, clusters, size);
    expect(result).toEqual([
      {
        clusterUuid: clusters[0].clusterUuid,
        ccs: 'Monitoring',
        versions: ['8.0.0', '7.2.1'],
      },
    ]);
  });
});

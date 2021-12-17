/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { fetchDiskUsageNodeStats } from './fetch_disk_usage_node_stats';

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

  it('fetch normal stats', async () => {
    esClient.search.mockReturnValue(
      // @ts-expect-error not full response interface
      elasticsearchClientMock.createSuccessTransportRequestPromise({
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
      })
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
});

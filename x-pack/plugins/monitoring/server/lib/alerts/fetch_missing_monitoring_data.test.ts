/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchMissingMonitoringData } from './fetch_missing_monitoring_data';

function getResponse(
  index: string,
  products: Array<{
    uuid: string;
    timestamp: number;
    nameSource: any;
  }>
) {
  return {
    buckets: products.map((product) => {
      return {
        key: product.uuid,
        most_recent: {
          value: product.timestamp,
        },
        document: {
          hits: {
            hits: [
              {
                _index: index,
                _source: product.nameSource,
              },
            ],
          },
        },
      };
    }),
  };
}

describe('fetchMissingMonitoringData', () => {
  let callCluster = jest.fn();
  const index = '.monitoring-*';
  const startMs = 100;
  const size = 10;

  it('fetch as expected', async () => {
    const now = 10;
    const clusters = [
      {
        clusterUuid: 'clusterUuid1',
        clusterName: 'clusterName1',
      },
    ];
    callCluster = jest.fn().mockImplementation((...args) => {
      return {
        aggregations: {
          clusters: {
            buckets: clusters.map((cluster) => ({
              key: cluster.clusterUuid,
              es_uuids: getResponse('.monitoring-es-*', [
                {
                  uuid: 'nodeUuid1',
                  nameSource: {
                    source_node: {
                      name: 'nodeName1',
                    },
                  },
                  timestamp: 9,
                },
                {
                  uuid: 'nodeUuid2',
                  nameSource: {
                    source_node: {
                      name: 'nodeName2',
                    },
                  },
                  timestamp: 2,
                },
              ]),
            })),
          },
        },
      };
    });
    const result = await fetchMissingMonitoringData(
      callCluster,
      clusters,
      index,
      size,
      now,
      startMs
    );
    expect(result).toEqual([
      {
        stackProduct: 'elasticsearch',
        stackProductUuid: 'nodeUuid1',
        stackProductName: 'nodeName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 1,
        ccs: null,
      },
      {
        stackProduct: 'elasticsearch',
        stackProductUuid: 'nodeUuid2',
        stackProductName: 'nodeName2',
        clusterUuid: 'clusterUuid1',
        gapDuration: 8,
        ccs: null,
      },
    ]);
  });

  it('should handle ccs', async () => {
    const now = 10;
    const clusters = [
      {
        clusterUuid: 'clusterUuid1',
        clusterName: 'clusterName1',
      },
    ];
    callCluster = jest.fn().mockImplementation((...args) => {
      return {
        aggregations: {
          clusters: {
            buckets: clusters.map((cluster) => ({
              key: cluster.clusterUuid,
              es_uuids: getResponse('Monitoring:.monitoring-es-*', [
                {
                  uuid: 'nodeUuid1',
                  nameSource: {
                    source_node: {
                      name: 'nodeName1',
                    },
                  },
                  timestamp: 9,
                },
              ]),
            })),
          },
        },
      };
    });
    const result = await fetchMissingMonitoringData(
      callCluster,
      clusters,
      index,
      size,
      now,
      startMs
    );
    expect(result).toEqual([
      {
        stackProduct: 'elasticsearch',
        stackProductUuid: 'nodeUuid1',
        stackProductName: 'nodeName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 1,
        ccs: 'Monitoring',
      },
    ]);
  });
});

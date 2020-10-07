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
              kibana_uuids: getResponse('.monitoring-kibana-*', [
                {
                  uuid: 'kibanaUuid1',
                  nameSource: {
                    kibana_stats: {
                      kibana: {
                        name: 'kibanaName1',
                      },
                    },
                  },
                  timestamp: 4,
                },
              ]),
              logstash_uuids: getResponse('.monitoring-logstash-*', [
                {
                  uuid: 'logstashUuid1',
                  nameSource: {
                    logstash_stats: {
                      logstash: {
                        host: 'logstashName1',
                      },
                    },
                  },
                  timestamp: 2,
                },
              ]),
              beats: {
                beats_uuids: getResponse('.monitoring-beats-*', [
                  {
                    uuid: 'beatUuid1',
                    nameSource: {
                      beats_stats: {
                        beat: {
                          name: 'beatName1',
                        },
                      },
                    },
                    timestamp: 0,
                  },
                ]),
              },
              apms: {
                apm_uuids: getResponse('.monitoring-beats-*', [
                  {
                    uuid: 'apmUuid1',
                    nameSource: {
                      beats_stats: {
                        beat: {
                          name: 'apmName1',
                          type: 'apm-server',
                        },
                      },
                    },
                    timestamp: 1,
                  },
                ]),
              },
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
      {
        stackProduct: 'kibana',
        stackProductUuid: 'kibanaUuid1',
        stackProductName: 'kibanaName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 6,
        ccs: null,
      },
      {
        stackProduct: 'logstash',
        stackProductUuid: 'logstashUuid1',
        stackProductName: 'logstashName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 8,
        ccs: null,
      },
      {
        stackProduct: 'beats',
        stackProductUuid: 'beatUuid1',
        stackProductName: 'beatName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 10,
        ccs: null,
      },
      {
        stackProduct: 'apm',
        stackProductUuid: 'apmUuid1',
        stackProductName: 'apmName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 9,
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

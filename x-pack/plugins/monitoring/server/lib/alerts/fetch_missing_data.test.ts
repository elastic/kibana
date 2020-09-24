/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from '@elastic/safer-lodash-set';
import { fetchMissingData } from './fetch_missing_data';

function getResponse(
  index: string,
  uuidKey: 'es_uuids' | 'kibana_uuids' | 'logstash_uuids' | 'beats.beats_uuids' | 'apms.apm_uuids',
  clusters: Array<{
    clusterUuid: string;
    products: Array<{
      uuid: string;
      timestamp: number;
      nameSource: any;
    }>;
  }>
) {
  return {
    key: index,
    clusters: {
      buckets: clusters.map((cluster) => {
        const result = {
          key: cluster.clusterUuid,
        };
        set(result, uuidKey, {
          buckets: cluster.products.map((product) => {
            return {
              key: product.uuid,
              most_recent: {
                value: product.timestamp,
              },
              document: {
                hits: {
                  hits: [
                    {
                      _source: product.nameSource,
                    },
                  ],
                },
              },
            };
          }),
        });
        return result;
      }),
    },
  };
}

describe('fetchMissingData', () => {
  let callCluster = jest.fn();
  const index = '.monitoring-*';
  const limit = 100;
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
          index: {
            buckets: [
              getResponse(
                '.monitoring-es-*',
                'es_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
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
                  ],
                }))
              ),
              getResponse(
                '.monitoring-kibana-*',
                'kibana_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
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
                  ],
                }))
              ),
              getResponse(
                '.monitoring-logstash-*',
                'logstash_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
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
                  ],
                }))
              ),
              getResponse(
                '.monitoring-beats-*',
                'beats.beats_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
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
                  ],
                }))
              ),
              getResponse(
                '.monitoring-beats-*',
                'apms.apm_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
                    {
                      uuid: 'apmUuid1',
                      nameSource: {
                        beats_stats: {
                          beat: {
                            name: 'apmName1',
                          },
                        },
                      },
                      timestamp: 1,
                    },
                  ],
                }))
              ),
            ],
          },
        },
      };
    });
    const result = await fetchMissingData(callCluster, clusters, index, limit, size, now);
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
          index: {
            buckets: [
              getResponse(
                'Monitoring:.monitoring-es-*',
                'es_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
                    {
                      uuid: 'nodeUuid1',
                      nameSource: {
                        source_node: {
                          name: 'nodeName1',
                        },
                      },
                      timestamp: 9,
                    },
                  ],
                }))
              ),
            ],
          },
        },
      };
    });
    const result = await fetchMissingData(callCluster, clusters, index, limit, size, now);
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

  it('should not return duplicates', async () => {
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
          index: {
            buckets: [
              getResponse(
                '.monitoring-es-*',
                'es_uuids',
                clusters.map((cluster) => ({
                  clusterUuid: cluster.clusterUuid,
                  products: [
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
                      uuid: 'nodeUuid1',
                      nameSource: {
                        source_node: {
                          name: 'nodeName1',
                        },
                      },
                      timestamp: 2,
                    },
                  ],
                }))
              ),
            ],
          },
        },
      };
    });
    const result = await fetchMissingData(callCluster, clusters, index, limit, size, now);
    expect(result).toEqual([
      {
        stackProduct: 'elasticsearch',
        stackProductUuid: 'nodeUuid1',
        stackProductName: 'nodeName1',
        clusterUuid: 'clusterUuid1',
        gapDuration: 8,
        ccs: null,
      },
    ]);
  });
});

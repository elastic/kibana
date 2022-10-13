/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { fetchMonitoredClusters } from './fetch_monitored_clusters';

const getMockLogger = () =>
  ({
    warn: sinon.spy(),
    error: sinon.spy(),
  } as unknown as Logger);

describe(__filename, () => {
  describe('fetchMonitoringClusters', () => {
    test('it should send multiple search queries', async () => {
      const searchFn = jest.fn().mockResolvedValue({
        aggregations: {
          clusters: {
            buckets: [],
          },
        },
      });

      await fetchMonitoredClusters({
        timeout: 10,
        monitoringIndex: 'foo',
        entSearchIndex: 'foo',
        timeRange: { min: 1652979091217, max: 11652979091217 },
        search: searchFn,
        logger: getMockLogger(),
      });

      assert.equal(searchFn.mock.calls.length, 3);
    });

    test('it should report request timeouts', async () => {
      const searchFn = jest
        .fn()
        .mockResolvedValueOnce({
          timed_out: false,
          aggregations: {},
        })
        .mockResolvedValueOnce({
          timed_out: true,
          aggregations: {},
        })
        .mockResolvedValueOnce({
          timed_out: false,
          aggregations: {},
        });

      const result = await fetchMonitoredClusters({
        timeout: 10,
        monitoringIndex: 'foo',
        entSearchIndex: 'foo',
        timeRange: { min: 1652979091217, max: 11652979091217 },
        search: searchFn,
        logger: getMockLogger(),
      });

      assert.equal(result.execution.timedOut, true);
    });

    test('it should report request errors', async () => {
      const searchFn = jest
        .fn()
        .mockResolvedValueOnce({
          timed_out: false,
          aggregations: {},
        })
        .mockRejectedValueOnce(new Error('massive failure'))
        .mockResolvedValueOnce({
          timed_out: false,
          aggregations: {},
        });

      const result = await fetchMonitoredClusters({
        timeout: 10,
        monitoringIndex: 'foo',
        entSearchIndex: 'foo',
        timeRange: { min: 1652979091217, max: 11652979091217 },
        search: searchFn,
        logger: getMockLogger(),
      });

      assert.equal(result.execution.timedOut, false);
      assert.deepEqual(result.execution.errors, ['massive failure']);
    });

    test('it should merge the query results', async () => {
      const mainMetricsetsResponse = {
        aggregations: {
          clusters: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cluster-id.1',
                doc_count: 11874,
                elasticsearch: {
                  meta: {},
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'es-node-id.1',
                      doc_count: 540,
                      enrich: {
                        meta: {},
                        doc_count: 180,
                        by_index: {
                          doc_count_error_upper_bound: 0,
                          sum_other_doc_count: 0,
                          buckets: [
                            {
                              key: '.ds-.monitoring-es-8-mb-2022.05.19-000001',
                              doc_count: 180,
                              last_seen: {
                                value: 1652975511716,
                                value_as_string: '2022-05-19T15:51:51.716Z',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },

                kibana: {
                  meta: {},
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'kibana-node-id.1',
                      doc_count: 540,
                      stats: {
                        meta: {},
                        doc_count: 180,
                        by_index: {
                          doc_count_error_upper_bound: 0,
                          sum_other_doc_count: 0,
                          buckets: [
                            {
                              key: '.ds-.monitoring-kibana-8-mb-2022.05.19-000001',
                              doc_count: 162,
                              last_seen: {
                                value: 1652975513680,
                                value_as_string: '2022-05-19T15:51:53.680Z',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const persistentMetricsetsResponse = {
        aggregations: {
          clusters: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cluster-id.1',
                doc_count: 11874,
                elasticsearch: {
                  meta: {},
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'es-node-id.1',
                      doc_count: 540,
                      shard: {
                        meta: {},
                        doc_count: 180,
                        by_index: {
                          doc_count_error_upper_bound: 0,
                          sum_other_doc_count: 0,
                          buckets: [
                            {
                              key: '.ds-.monitoring-es-8-mb-2022.05.19-000001',
                              doc_count: 180,
                              last_seen: {
                                value: 1652975511716,
                                value_as_string: '2022-05-19T15:51:51.716Z',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const entsearchMetricsetsResponse = {
        aggregations: {
          clusters: {
            meta: {},
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'cluster-id.1',
                doc_count: 11874,
                enterpriseSearch: {
                  meta: {},
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'ent-search-node-id.1',
                      doc_count: 540,
                      health: {
                        meta: {},
                        doc_count: 180,
                        by_index: {
                          doc_count_error_upper_bound: 0,
                          sum_other_doc_count: 0,
                          buckets: [
                            {
                              key: '.ds-.monitoring-ent-search-8-mb-2022.05.19-000001',
                              doc_count: 180,
                              last_seen: {
                                value: 1652975511716,
                                value_as_string: '2022-05-19T15:51:51.716Z',
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const searchFn = jest
        .fn()
        .mockResolvedValueOnce(mainMetricsetsResponse)
        .mockResolvedValueOnce(persistentMetricsetsResponse)
        .mockResolvedValueOnce(entsearchMetricsetsResponse);

      const monitoredClusters = await fetchMonitoredClusters({
        timeout: 10,
        monitoringIndex: 'foo',
        entSearchIndex: 'foo',
        timeRange: { min: 1652979091217, max: 11652979091217 },
        search: searchFn,
        logger: getMockLogger(),
      });

      assert.deepEqual(monitoredClusters, {
        execution: {
          timedOut: false,
          errors: [],
        },

        clusters: {
          'cluster-id.1': {
            elasticsearch: {
              'es-node-id.1': {
                enrich: {
                  'metricbeat-8': {
                    index: '.ds-.monitoring-es-8-mb-2022.05.19-000001',
                    lastSeen: '2022-05-19T15:51:51.716Z',
                  },
                },
                shard: {
                  'metricbeat-8': {
                    index: '.ds-.monitoring-es-8-mb-2022.05.19-000001',
                    lastSeen: '2022-05-19T15:51:51.716Z',
                  },
                },
              },
            },

            kibana: {
              'kibana-node-id.1': {
                stats: {
                  'metricbeat-8': {
                    index: '.ds-.monitoring-kibana-8-mb-2022.05.19-000001',
                    lastSeen: '2022-05-19T15:51:53.680Z',
                  },
                },
              },
            },

            enterpriseSearch: {
              'ent-search-node-id.1': {
                health: {
                  'metricbeat-8': {
                    index: '.ds-.monitoring-ent-search-8-mb-2022.05.19-000001',
                    lastSeen: '2022-05-19T15:51:51.716Z',
                  },
                },
              },
            },
          },
        },
      });
    });
  });
});

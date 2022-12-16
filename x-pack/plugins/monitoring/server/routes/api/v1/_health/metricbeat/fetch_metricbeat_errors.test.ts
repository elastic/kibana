/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { fetchMetricbeatErrors } from './fetch_metricbeat_errors';

const getMockLogger = () =>
  ({
    warn: sinon.spy(),
    error: sinon.spy(),
  } as unknown as Logger);

describe(__filename, () => {
  describe('fetchMetricbeatErrors', () => {
    test('it fetch and build metricbeat errors response', async () => {
      const response = {
        aggregations: {
          errors_aggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'logstash',
                doc_count: 180,
                errors_by_dataset: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'node',
                      doc_count: 90,
                      latest_docs: {
                        hits: {
                          total: {
                            value: 90,
                            relation: 'eq',
                          },
                          max_score: null,
                          hits: [
                            {
                              _index: '.ds-metricbeat-8.4.0-2022.07.27-000001',
                              _id: 'djXRP4IBU_ii2T3qLwey',
                              _score: null,
                              _source: {
                                '@timestamp': '2022-07-27T13:20:49.070Z',
                                metricset: {
                                  period: 10000,
                                  name: 'node',
                                },
                                error: {
                                  message:
                                    'error making http request: Get "http://host.docker.internal:9600/": dial tcp 192.168.65.2:9600: connect: connection refused',
                                },
                              },
                              sort: [1658928049070],
                            },
                            {
                              _index: '.ds-metricbeat-8.4.0-2022.07.27-000001',
                              _id: 'UTXRP4IBU_ii2T3qCAef',
                              _score: null,
                              _source: {
                                '@timestamp': '2022-07-27T13:20:39.066Z',
                                metricset: {
                                  period: 10000,
                                  name: 'node',
                                },
                                error: {
                                  message:
                                    'error making http request: Get "http://host.docker.internal:9600/": dial tcp 192.168.65.2:9600: connect: connection refused',
                                },
                              },
                              sort: [1658928039066],
                            },
                          ],
                        },
                      },
                    },
                    {
                      key: 'node_stats',
                      doc_count: 90,
                      latest_docs: {
                        hits: {
                          total: {
                            value: 90,
                            relation: 'eq',
                          },
                          max_score: null,
                          hits: [
                            {
                              _index: '.ds-metricbeat-8.4.0-2022.07.27-000001',
                              _id: 'eTXRP4IBU_ii2T3qLwey',
                              _score: null,
                              _source: {
                                '@timestamp': '2022-07-27T13:20:49.580Z',
                                metricset: {
                                  period: 10000,
                                  name: 'node_stats',
                                },
                                error: {
                                  message:
                                    'error making http request: Get "http://host.docker.internal:9600/": dial tcp 192.168.65.2:9600: connect: connection refused',
                                },
                              },
                              sort: [1658928049580],
                            },
                            {
                              _index: '.ds-metricbeat-8.4.0-2022.07.27-000001',
                              _id: 'VDXRP4IBU_ii2T3qCAef',
                              _score: null,
                              _source: {
                                '@timestamp': '2022-07-27T13:20:39.582Z',
                                metricset: {
                                  period: 10000,
                                  name: 'node_stats',
                                },
                                error: {
                                  message:
                                    'error making http request: Get "http://host.docker.internal:9600/": dial tcp 192.168.65.2:9600: connect: connection refused',
                                },
                              },
                              sort: [1658928039582],
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

      const searchFn = jest.fn().mockResolvedValueOnce(response);

      const monitoredClusters = await fetchMetricbeatErrors({
        timeout: 10,
        metricbeatIndex: 'foo',
        timeRange: { min: 1652979091217, max: 11652979091217 },
        search: searchFn,
        logger: getMockLogger(),
      });

      assert.deepEqual(monitoredClusters, {
        execution: {
          timedOut: false,
          errors: [],
        },
        products: {
          logstash: {
            node: [
              {
                lastSeen: '2022-07-27T13:20:49.070Z',
                message:
                  'error making http request: Get "http://host.docker.internal:9600/": dial tcp 192.168.65.2:9600: connect: connection refused',
              },
            ],
            node_stats: [
              {
                lastSeen: '2022-07-27T13:20:49.580Z',
                message:
                  'error making http request: Get "http://host.docker.internal:9600/": dial tcp 192.168.65.2:9600: connect: connection refused',
              },
            ],
          },
        },
      });
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { fetchPackageErrors } from './fetch_package_errors';

const getMockLogger = () =>
  ({
    warn: sinon.spy(),
    error: sinon.spy(),
  } as unknown as Logger);

describe(__filename, () => {
  describe('fetchPackageErrors', () => {
    test('it fetch and build package errors response', async () => {
      const response = {
        aggregations: {
          errors_aggregation: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'elasticsearch',
                doc_count: 22,
                errors_by_dataset: {
                  doc_count_error_upper_bound: 0,
                  sum_other_doc_count: 0,
                  buckets: [
                    {
                      key: 'elasticsearch.stack_monitoring.pending_tasks',
                      doc_count: 22,
                      latest_docs: {
                        hits: {
                          total: {
                            value: 22,
                            relation: 'eq',
                          },
                          max_score: null,
                          hits: [
                            {
                              _index:
                                '.ds-metrics-elasticsearch.stack_monitoring.node-default-2023.01.10-000001',
                              _id: '-oAfnIUB94omKO-pWCeN',
                              _score: null,
                              _source: {
                                '@timestamp': '2023-01-10T14:39:37.114Z',
                                metricset: {
                                  period: 10000,
                                  name: 'node',
                                },
                                error: {
                                  message:
                                    'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                    {
                      key: 'elasticsearch.stack_monitoring.node',
                      doc_count: 22,
                      latest_docs: {
                        hits: {
                          total: {
                            value: 22,
                            relation: 'eq',
                          },
                          max_score: null,
                          hits: [
                            {
                              _index:
                                '.ds-metrics-elasticsearch.stack_monitoring.node-default-2023.01.10-000001',
                              _id: '-oAfnIUB94omKO-pWCeN',
                              _score: null,
                              _source: {
                                '@timestamp': '2023-01-10T14:39:37.156Z',
                                metricset: {
                                  period: 10000,
                                  name: 'node',
                                },
                                error: {
                                  message:
                                    'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
                                },
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

      const searchFn = jest.fn().mockResolvedValueOnce(response);

      const monitoredClusters = await fetchPackageErrors({
        timeout: 10,
        timeRange: { min: 1673361577110, max: 1673361567118 },
        packageIndex: 'metrics-*',
        search: searchFn,
        logger: getMockLogger(),
      });

      assert.deepEqual(monitoredClusters, {
        execution: {
          timedOut: false,
          errors: [],
        },
        products: {
          elasticsearch: {
            'elasticsearch.stack_monitoring.node': [
              {
                message:
                  'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
                lastSeen: '2023-01-10T14:39:37.156Z',
              },
            ],
            'elasticsearch.stack_monitoring.pending_tasks': [
              {
                message:
                  'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
                lastSeen: '2023-01-10T14:39:37.114Z',
              },
            ],
          },
        },
      });
    });
  });
});

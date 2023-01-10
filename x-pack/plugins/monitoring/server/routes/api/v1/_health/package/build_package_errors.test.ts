/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPackageErrors } from './build_package_errors';
import assert from 'assert';

describe(__filename, () => {
  describe('buildPackageErrors', () => {
    test('it should build an object containing dedup error messages per event.dataset', () => {
      const packageErrors = [
        {
          key: 'elasticsearch',
          errors_by_dataset: {
            buckets: [
              {
                key: 'state',
                latest_docs: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          '@timestamp': '2023-01-10T14:39:37.114Z',
                          error: {
                            message:
                              'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
                          },
                        },
                      },
                      {
                        _source: {
                          '@timestamp': '2023-01-10T14:39:27.114Z',
                          error: {
                            message:
                              'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
                          },
                        },
                      },
                      {
                        _source: {
                          '@timestamp': '2022-07-26T08:41:32.625Z',
                          error: {
                            message: 'Generic random error',
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
      ];

      const monitoredClusters = buildPackageErrors(packageErrors);
      assert.deepEqual(monitoredClusters, {
        elasticsearch: {
          state: [
            {
              lastSeen: '2023-01-10T14:39:37.114Z',
              message:
                'error making http request: Get "https://localhost:9200/_nodes/_local": dial tcp [::1]:9200: connect: cannot assign requested address',
            },
            {
              lastSeen: '2022-07-26T08:41:32.625Z',
              message: 'Generic random error',
            },
          ],
        },
      });
    });
  });
});

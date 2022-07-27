/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildMetricbeatErrors } from './build_metricbeat_errors';
import assert from 'assert';

describe(__filename, () => {
  describe('buildMetricbeatErrors', () => {
    test('it should build an object containing dedup error messages per event.dataset', () => {
      const metricbeatErrors = [
        {
          key: 'beat',
          errors_by_dataset: {
            buckets: [
              {
                key: 'state',
                latest_docs: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          '@timestamp': '2022-07-26T08:43:32.625Z',
                          error: {
                            message:
                              'error making http request: Get "http://host.docker.internal:5067/state": dial tcp 192.168.65.2:5067: connect: connection refused',
                          },
                        },
                      },
                      {
                        _source: {
                          '@timestamp': '2022-07-26T08:42:32.625Z',
                          error: {
                            message:
                              'error making http request: Get "http://host.docker.internal:5067/state": dial tcp 192.168.65.2:5067: connect: connection refused',
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

      const monitoredClusters = buildMetricbeatErrors(metricbeatErrors);
      assert.deepEqual(monitoredClusters, {
        beat: {
          state: [
            {
              lastSeen: '2022-07-26T08:43:32.625Z',
              message:
                'error making http request: Get "http://host.docker.internal:5067/state": dial tcp 192.168.65.2:5067: connect: connection refused',
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

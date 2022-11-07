/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUptimeESMockClient } from '../../legacy_uptime/lib/requests/test_helpers';
import { queryMonitorStatus, periodToMs } from './current_status';

jest.mock('../common', () => ({
  getMonitors: jest.fn().mockReturnValue({
    per_page: 10,
    saved_objects: [
      {
        id: 'mon-1',
        attributes: {
          enabled: false,
          locations: ['us-east1', 'us-west1', 'japan'],
        },
      },
      {
        id: 'mon-2',
        attributes: {
          enabled: true,
          locations: ['us-east1', 'us-west1', 'japan'],
          schedule: {
            number: '10',
            unit: 'm',
          },
        },
      },
    ],
  }),
}));

jest.mock('../../legacy_uptime/lib/requests/get_snapshot_counts', () => ({
  getSnapshotCount: jest.fn().mockReturnValue({
    up: 2,
    down: 1,
    total: 3,
  }),
}));

describe('current status route', () => {
  describe('periodToMs', () => {
    it('returns 0 for unsupported unit type', () => {
      // @ts-expect-error Providing invalid value to test handler in function
      expect(periodToMs({ number: '10', unit: 'rad' })).toEqual(0);
    });
    it('converts seconds', () => {
      expect(periodToMs({ number: '10', unit: 's' })).toEqual(10_000);
    });
    it('converts minutes', () => {
      expect(periodToMs({ number: '1', unit: 'm' })).toEqual(60_000);
    });
    it('converts hours', () => {
      expect(periodToMs({ number: '1', unit: 'h' })).toEqual(3_600_000);
    });
  });

  describe('getStats', () => {
    it('parses expected agg fields', async () => {
      const { esClient, uptimeEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse([
          {
            key: 'id1',
            location: {
              buckets: [
                {
                  key: 'Asia/Pacific - Japan',
                  status: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2022-09-15T16:08:16.724Z',
                            monitor: {
                              status: 'up',
                              id: 'id1',
                            },
                            summary: {
                              up: 1,
                              down: 0,
                            },
                            config_id: 'id1',
                            observer: {
                              geo: {
                                name: 'test-location',
                              },
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
          {
            key: 'id2',
            location: {
              buckets: [
                {
                  key: 'Asia/Pacific - Japan',
                  status: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2022-09-15T16:09:16.724Z',
                            monitor: {
                              status: 'up',
                              id: 'id2',
                            },
                            summary: {
                              up: 1,
                              down: 0,
                            },
                            config_id: 'id2',
                            observer: {
                              geo: {
                                name: 'test-location',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  key: 'Europe - Germany',
                  status: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2022-09-15T16:19:16.724Z',
                            monitor: {
                              status: 'down',
                              id: 'id2',
                            },
                            summary: {
                              down: 1,
                              up: 0,
                            },
                            config_id: 'id2',
                            observer: {
                              geo: {
                                name: 'test-location',
                              },
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
        ])
      );
      expect(await queryMonitorStatus(uptimeEsClient, 3, 140000, ['id1', 'id2'])).toEqual({
        down: 1,
        up: 2,
        upConfigs: [
          {
            configId: 'id1',
            heartbeatId: 'id1',
            location: 'test-location',
          },
          {
            configId: 'id2',
            heartbeatId: 'id2',
            location: 'test-location',
          },
        ],
        downConfigs: [
          {
            configId: 'id2',
            heartbeatId: 'id2',
            location: 'test-location',
          },
        ],
      });
    });

    it('handles limits with multiple requests', async () => {
      const { esClient, uptimeEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(
        getEsResponse([
          {
            key: 'id1',
            location: {
              buckets: [
                {
                  key: 'Asia/Pacific - Japan',
                  status: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2022-09-15T16:08:16.724Z',
                            monitor: {
                              status: 'up',
                              id: 'id1',
                            },
                            summary: {
                              up: 1,
                              down: 0,
                            },
                            config_id: 'id1',
                            observer: {
                              geo: {
                                name: 'test-location',
                              },
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
          {
            key: 'id2',
            location: {
              buckets: [
                {
                  key: 'Asia/Pacific - Japan',
                  status: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2022-09-15T16:09:16.724Z',
                            monitor: {
                              status: 'up',
                              id: 'id2',
                            },
                            summary: {
                              up: 1,
                              down: 0,
                            },
                            config_id: 'id2',
                            observer: {
                              geo: {
                                name: 'test-location',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  key: 'Europe - Germany',
                  status: {
                    hits: {
                      hits: [
                        {
                          _source: {
                            '@timestamp': '2022-09-15T16:19:16.724Z',
                            monitor: {
                              status: 'down',
                              id: 'id2',
                            },
                            summary: {
                              up: 0,
                              down: 1,
                            },
                            config_id: 'id2',
                            observer: {
                              geo: {
                                name: 'test-location',
                              },
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
        ])
      );

      /**
       * By passing the function a location count of 10k, it forces the query to paginate once,
       * so we are able to test that the function properly iterates through a "large" list of IDs/locations.
       *
       * The expectation here is we will send the test client two separate "requests", one for each of the two IDs.
       */
      expect(await queryMonitorStatus(uptimeEsClient, 10000, 2500, ['id1', 'id2'])).toEqual({
        down: 1,
        up: 2,
        upConfigs: [
          {
            configId: 'id1',
            heartbeatId: 'id1',
            location: 'test-location',
          },
          {
            configId: 'id2',
            heartbeatId: 'id2',
            location: 'test-location',
          },
        ],
        downConfigs: [
          {
            configId: 'id2',
            heartbeatId: 'id2',
            location: 'test-location',
          },
        ],
      });
      expect(esClient.search).toHaveBeenCalledTimes(2);
      // These assertions are to ensure that we are paginating through the IDs we use for filtering
      // @ts-expect-error mock search is not lining up with expected type
      expect(esClient.search.mock.calls[0][0].query.bool.filter[1].terms['monitor.id']).toEqual([
        'id1',
      ]);
      // @ts-expect-error mock search is not lining up with expected type
      expect(esClient.search.mock.calls[1][0].query.bool.filter[1].terms['monitor.id']).toEqual([
        'id2',
      ]);
    });
  });
});

function getEsResponse(buckets: any[]) {
  return {
    took: 605,
    timed_out: false,
    _shards: {
      total: 3,
      successful: 3,
      skipped: 0,
      failed: 0,
    },
    hits: {
      hits: [],
    },
    aggregations: {
      id: {
        buckets,
      },
    },
  };
}

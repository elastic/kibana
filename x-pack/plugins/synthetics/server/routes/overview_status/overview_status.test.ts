/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { getUptimeESMockClient } from '../../legacy_uptime/lib/requests/test_helpers';
import { periodToMs } from './overview_status';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { RouteContext } from '../../legacy_uptime/routes';
import { getStatus } from './overview_status';
import times from 'lodash/times';
import * as monitorsFns from '../../saved_objects/synthetics_monitor/get_all_monitors';
import { EncryptedSyntheticsMonitor } from '../../../common/runtime_types';

jest.mock('../../saved_objects/synthetics_monitor/get_all_monitors', () => ({
  ...jest.requireActual('../../saved_objects/synthetics_monitor/get_all_monitors'),
  getAllMonitors: jest.fn(),
}));

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
  getMonitorFilters: () => '',
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

  describe('queryMonitorStatus', () => {
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Europe - Germany',
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
      expect(
        await queryMonitorStatus(
          uptimeEsClient,
          ['Europe - Germany', 'Asia/Pacific - Japan'],
          { from: 'now-1d', to: 'now' },
          ['id1', 'id2'],
          { id1: ['Asia/Pacific - Japan'], id2: ['Europe - Germany', 'Asia/Pacific - Japan'] },
          {
            id1: 'id1',
            id2: 'id2',
          }
        )
      ).toEqual({
        pending: 0,
        down: 1,
        enabledMonitorQueryIds: ['id1', 'id2'],
        up: 2,
        upConfigs: {
          'id1-Asia/Pacific - Japan': {
            configId: 'id1',
            monitorQueryId: 'id1',
            location: 'Asia/Pacific - Japan',
            status: 'up',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
          'id2-Asia/Pacific - Japan': {
            configId: 'id2',
            monitorQueryId: 'id2',
            location: 'Asia/Pacific - Japan',
            status: 'up',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
        },
        downConfigs: {
          'id2-Europe - Germany': {
            configId: 'id2',
            monitorQueryId: 'id2',
            location: 'Europe - Germany',
            status: 'down',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
        },
        pendingConfigs: {},
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Europe - Germany',
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
      const concernedLocations = [
        'Asia/Pacific - Japan',
        'Europe - Germany',
        'Asia/Pacific - Japan',
      ];
      expect(
        await queryMonitorStatus(
          uptimeEsClient,
          [...concernedLocations, ...times(9997).map((n) => 'Europe - Germany' + n)],
          { from: 'now-24h', to: 'now' },
          ['id1', 'id2'],
          { id1: [concernedLocations[0]], id2: [concernedLocations[1], concernedLocations[2]] },
          {
            id1: 'id1',
            id2: 'id2',
          }
        )
      ).toEqual({
        pending: 0,
        down: 1,
        enabledMonitorQueryIds: ['id1', 'id2'],
        up: 2,
        upConfigs: {
          'id1-Asia/Pacific - Japan': {
            configId: 'id1',
            monitorQueryId: 'id1',
            location: 'Asia/Pacific - Japan',
            status: 'up',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
          'id2-Asia/Pacific - Japan': {
            configId: 'id2',
            monitorQueryId: 'id2',
            location: 'Asia/Pacific - Japan',
            status: 'up',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
        },
        downConfigs: {
          'id2-Europe - Germany': {
            configId: 'id2',
            monitorQueryId: 'id2',
            location: 'Europe - Germany',
            status: 'down',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
        },
        pendingConfigs: {},
      });
      expect(esClient.search).toHaveBeenCalledTimes(2);
      // These assertions are to ensure that we are paginating through the IDs we use for filtering
      expect(
        // @ts-expect-error mock search is not lining up with expected type
        esClient.search.mock.calls[0][0].body.query.bool.filter[2].terms['monitor.id']
      ).toEqual(['id1']);
      expect(
        // @ts-expect-error mock search is not lining up with expected type
        esClient.search.mock.calls[1][0].body.query.bool.filter[2].terms['monitor.id']
      ).toEqual(['id2']);
    });

    it('handles pending configs', async () => {
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Europe - Germany',
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
      expect(
        await queryMonitorStatus(
          uptimeEsClient,
          ['Europe - Germany', 'Asia/Pacific - Japan'],
          { from: 'now-12h', to: 'now' },
          ['id1', 'id2', 'project-monitor-id', 'id4'],
          {
            id1: ['Asia/Pacific - Japan'],
            id2: ['Europe - Germany', 'Asia/Pacific - Japan'],
            'project-monitor-id': ['Europe - Germany', 'Asia/Pacific - Japan'],
            id4: ['Europe - Germany', 'Asia/Pacific - Japan'],
          },
          {
            id1: 'id1',
            id2: 'id2',
            'project-monitor-id': 'id3',
            id4: 'id4',
          }
        )
      ).toEqual({
        pending: 4,
        down: 1,
        enabledMonitorQueryIds: ['id1', 'id2', 'project-monitor-id', 'id4'],
        up: 2,
        upConfigs: {
          'id1-Asia/Pacific - Japan': {
            configId: 'id1',
            monitorQueryId: 'id1',
            location: 'Asia/Pacific - Japan',
            status: 'up',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
          'id2-Asia/Pacific - Japan': {
            configId: 'id2',
            monitorQueryId: 'id2',
            location: 'Asia/Pacific - Japan',
            status: 'up',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
        },
        downConfigs: {
          'id2-Europe - Germany': {
            configId: 'id2',
            monitorQueryId: 'id2',
            location: 'Europe - Germany',
            status: 'down',
            ping: expect.any(Object),
            timestamp: expect.any(String),
          },
        },
        pendingConfigs: {
          'id3-Asia/Pacific - Japan': {
            configId: 'id3',
            location: 'Asia/Pacific - Japan',
            monitorQueryId: 'project-monitor-id',
            status: 'unknown',
          },
          'id3-Europe - Germany': {
            configId: 'id3',
            location: 'Europe - Germany',
            monitorQueryId: 'project-monitor-id',
            status: 'unknown',
          },
          'id4-Asia/Pacific - Japan': {
            configId: 'id4',
            location: 'Asia/Pacific - Japan',
            monitorQueryId: 'id4',
            status: 'unknown',
          },
          'id4-Europe - Germany': {
            configId: 'id4',
            location: 'Europe - Germany',
            monitorQueryId: 'id4',
            status: 'unknown',
          },
        },
      });
    });
  });

  describe('getStatus', () => {
    it.each([
      [['US Central QA'], 1],
      [['North America - US Central'], 1],
      [['North America - US Central', 'US Central QA'], 2],
      [undefined, 2],
    ])('handles disabled count when using location filters', async (locations, disabledCount) => {
      jest.spyOn(monitorsFns, 'getAllMonitors').mockResolvedValue([
        {
          type: 'synthetics-monitor',
          id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
          attributes: {
            enabled: false,
            schedule: {
              number: '3',
              unit: 'm',
            },
            config_id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
            locations: [
              {
                color: 'default',
                isServiceManaged: true,
                label: 'US Central QA',
                id: 'us_central_qa',
              },
              {
                isServiceManaged: true,
                label: 'North America - US Central',
                id: 'us_central',
              },
            ],
            origin: 'project',
            id: 'a-test2-default',
          },
          references: [],
          migrationVersion: {
            'synthetics-monitor': '8.6.0',
          },
          coreMigrationVersion: '8.0.0',
          updated_at: '2023-02-28T14:31:37.641Z',
          created_at: '2023-02-28T14:31:37.641Z',
          version: 'Wzg0MzkzLDVd',
          namespaces: ['default'],
          score: null,
          sort: ['a', 3013],
        } as unknown as SavedObjectsFindResult<EncryptedSyntheticsMonitor>,
      ]);
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Asia/Pacific - Japan',
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
                                name: 'Europe - Germany',
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
      expect(
        await getStatus(
          {
            uptimeEsClient,
            savedObjectsClient: savedObjectsClientMock.create(),
          } as unknown as RouteContext,
          {
            locations,
          }
        )
      ).toEqual(
        expect.objectContaining({
          disabledCount,
        })
      );
    });

    it.each([
      [['US Central QA'], 1],
      [['North America - US Central'], 1],
      [['North America - US Central', 'US Central QA'], 2],
      [undefined, 2],
    ])('handles pending count when using location filters', async (locations, pending) => {
      jest.spyOn(monitorsFns, 'getAllMonitors').mockResolvedValue([
        {
          type: 'synthetics-monitor',
          id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
          attributes: {
            enabled: true,
            schedule: {
              number: '3',
              unit: 'm',
            },
            config_id: 'a9a94f2f-47ba-4fe2-afaa-e5cd29b281f1',
            locations: [
              {
                color: 'default',
                isServiceManaged: true,
                label: 'US Central QA',
                id: 'us_central_qa',
              },
              {
                isServiceManaged: true,
                label: 'North America - US Central',
                id: 'us_central',
              },
            ],
            origin: 'project',
            id: 'a-test2-default',
          },
          references: [],
          migrationVersion: {
            'synthetics-monitor': '8.6.0',
          },
          coreMigrationVersion: '8.0.0',
          updated_at: '2023-02-28T14:31:37.641Z',
          created_at: '2023-02-28T14:31:37.641Z',
          version: 'Wzg0MzkzLDVd',
          namespaces: ['default'],
          score: null,
          sort: ['a', 3013],
        } as unknown as SavedObjectsFindResult<EncryptedSyntheticsMonitor>,
      ]);
      const { esClient, uptimeEsClient } = getUptimeESMockClient();
      esClient.search.mockResponseOnce(getEsResponse([]));
      expect(
        await getStatus(
          {
            uptimeEsClient,
            savedObjectsClient: savedObjectsClientMock.create(),
          } as unknown as RouteContext,
          {
            locations,
          }
        )
      ).toEqual(
        expect.objectContaining({
          pending,
        })
      );
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

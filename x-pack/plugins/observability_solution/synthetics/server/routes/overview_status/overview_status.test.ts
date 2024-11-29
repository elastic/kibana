/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { periodToMs } from './overview_status';
import { queryMonitorStatus } from '../../queries/query_monitor_status';
import { getStatus } from './overview_status';
import times from 'lodash/times';
import { EncryptedSyntheticsMonitorAttributes } from '../../../common/runtime_types';
import { RouteContext } from '../types';
import { getUptimeESMockClient } from '../../queries/test_helpers';

import * as commonLibs from '../common';
import { SyntheticsServerSetup } from '../../types';
import { mockEncryptedSO } from '../../synthetics_service/utils/mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import * as allLocationsFn from '../../synthetics_service/get_all_locations';
const allLocations: any = [
  {
    id: 'us_central_qa',
    label: 'US Central QA',
  },
  {
    id: 'us_central',
    label: 'North America - US Central',
  },
];
jest.spyOn(allLocationsFn, 'getAllLocations').mockResolvedValue({
  publicLocations: allLocations,
  privateLocations: [],
  allLocations,
});

jest.mock('../../saved_objects/synthetics_monitor/get_all_monitors', () => ({
  ...jest.requireActual('../../saved_objects/synthetics_monitor/get_all_monitors'),
  getAllMonitors: jest.fn(),
}));

jest.spyOn(commonLibs, 'getMonitors').mockResolvedValue({
  per_page: 10,
  saved_objects: [
    {
      id: 'mon-1',
      attributes: {
        enabled: false,
        locations: [{ id: 'us-east1' }, { id: 'us-west1' }, { id: 'japan' }],
      },
    },
    {
      id: 'mon-2',
      attributes: {
        enabled: true,
        locations: [{ id: 'us-east1' }, { id: 'us-west1' }, { id: 'japan' }],
        schedule: {
          number: '10',
          unit: 'm',
        },
      },
    },
  ],
} as any);

describe('current status route', () => {
  const logger = loggerMock.create();

  const serverMock: SyntheticsServerSetup = {
    logger,
    config: {
      service: {
        username: 'dev',
        password: '12345',
        manifestUrl: 'http://localhost:8080/api/manifest',
      },
    },
    spaces: {
      spacesService: {
        getSpaceId: jest.fn().mockReturnValue('test-space'),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
    coreStart: {
      savedObjects: savedObjectsServiceMock.createStartContract(),
    },
  } as unknown as SyntheticsServerSetup;

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

  const testMonitors = [
    {
      attributes: {
        id: 'id1',
        type: 'browser',
        enabled: true,
        name: 'test monitor 1',
        project_id: 'project-id',
        tags: ['tag-1', 'tag-2'],
        schedule: {
          number: '1',
          unit: 'm',
        },
      },
    },
    {
      attributes: {
        id: 'id2',
        enabled: true,
        type: 'browser',
        name: 'test monitor 2',
        project_id: 'project-id',
        tags: ['tag-1', 'tag-2'],
        schedule: {
          number: '1',
          unit: 'm',
        },
      },
    },
  ];

  describe('queryMonitorStatus', () => {
    it('parses expected agg fields', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.msearch.mockResponseOnce({
        responses: [
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
          ]),
        ],
        took: 605,
      });
      expect(
        await queryMonitorStatus({
          esClient: syntheticsEsClient,
          monitorLocationIds: ['Europe - Germany', 'Asia/Pacific - Japan'],
          range: { from: 'now-1d', to: 'now' },
          monitorQueryIds: ['id1', 'id2'],
          monitorLocationsMap: {
            id1: ['Asia/Pacific - Japan'],
            id2: ['Europe - Germany', 'Asia/Pacific - Japan'],
          },
          monitorQueryIdToConfigIdMap: {
            id1: 'id1',
            id2: 'id2',
          },
          monitors: testMonitors as any,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "disabledConfigs": Object {},
          "down": 1,
          "downConfigs": Object {
            "id2-Europe - Germany": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Europe - Germany",
              "locationLabel": "Europe - Germany",
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "ping": Object {
                "@timestamp": "2022-09-15T16:19:16.724Z",
                "config_id": "id2",
                "monitor": Object {
                  "id": "id2",
                  "status": "down",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Europe - Germany",
                  },
                },
                "summary": Object {
                  "down": 1,
                  "up": 0,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "down",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
          },
          "enabledMonitorQueryIds": Array [
            "id1",
            "id2",
          ],
          "pending": 0,
          "pendingConfigs": Object {},
          "up": 2,
          "upConfigs": Object {
            "id1-Asia/Pacific - Japan": Object {
              "configId": "id1",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": "Asia/Pacific - Japan",
              "monitorQueryId": "id1",
              "name": "test monitor 1",
              "ping": Object {
                "@timestamp": "2022-09-15T16:08:16.724Z",
                "config_id": "id1",
                "monitor": Object {
                  "id": "id1",
                  "status": "up",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Asia/Pacific - Japan",
                  },
                },
                "summary": Object {
                  "down": 0,
                  "up": 1,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "up",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:08:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
            "id2-Asia/Pacific - Japan": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": "Asia/Pacific - Japan",
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "ping": Object {
                "@timestamp": "2022-09-15T16:09:16.724Z",
                "config_id": "id2",
                "monitor": Object {
                  "id": "id2",
                  "status": "up",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Asia/Pacific - Japan",
                  },
                },
                "summary": Object {
                  "down": 0,
                  "up": 1,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "up",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:09:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
          },
        }
      `);
    });

    it('handles limits with multiple requests', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.msearch.mockResponseOnce({
        responses: [
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
          ]),
        ],
        took: 605,
      });

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
        await queryMonitorStatus({
          esClient: syntheticsEsClient,
          monitorLocationIds: [
            ...concernedLocations,
            ...times(9997).map((n) => 'Europe - Germany' + n),
          ],

          range: { from: 'now-24h', to: 'now' },
          monitorQueryIds: ['id1', 'id2'],
          monitorLocationsMap: {
            id1: [concernedLocations[0]],
            id2: [concernedLocations[1], concernedLocations[2]],
          },
          monitorQueryIdToConfigIdMap: {
            id1: 'id1',
            id2: 'id2',
          },
          monitors: testMonitors as any,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "disabledConfigs": Object {},
          "down": 1,
          "downConfigs": Object {
            "id2-Europe - Germany": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Europe - Germany",
              "locationLabel": "Europe - Germany",
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "ping": Object {
                "@timestamp": "2022-09-15T16:19:16.724Z",
                "config_id": "id2",
                "monitor": Object {
                  "id": "id2",
                  "status": "down",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Europe - Germany",
                  },
                },
                "summary": Object {
                  "down": 1,
                  "up": 0,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "down",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
          },
          "enabledMonitorQueryIds": Array [
            "id1",
            "id2",
          ],
          "pending": 0,
          "pendingConfigs": Object {},
          "up": 2,
          "upConfigs": Object {
            "id1-Asia/Pacific - Japan": Object {
              "configId": "id1",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": "Asia/Pacific - Japan",
              "monitorQueryId": "id1",
              "name": "test monitor 1",
              "ping": Object {
                "@timestamp": "2022-09-15T16:08:16.724Z",
                "config_id": "id1",
                "monitor": Object {
                  "id": "id1",
                  "status": "up",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Asia/Pacific - Japan",
                  },
                },
                "summary": Object {
                  "down": 0,
                  "up": 1,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "up",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:08:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
            "id2-Asia/Pacific - Japan": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": "Asia/Pacific - Japan",
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "ping": Object {
                "@timestamp": "2022-09-15T16:09:16.724Z",
                "config_id": "id2",
                "monitor": Object {
                  "id": "id2",
                  "status": "up",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Asia/Pacific - Japan",
                  },
                },
                "summary": Object {
                  "down": 0,
                  "up": 1,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "up",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:09:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
          },
        }
      `);
      expect(esClient.msearch).toHaveBeenCalledTimes(1);
      // These assertions are to ensure that we are paginating through the IDs we use for filtering
      expect(
        // @ts-expect-error mock search is not lining up with expected type
        esClient.msearch.mock.calls[0][0].searches[1].query.bool.filter[2].terms['monitor.id']
      ).toEqual(['id1']);
      expect(
        // @ts-expect-error mock search is not lining up with expected type
        esClient.msearch.mock.calls[0][0].searches[3].query.bool.filter[2].terms['monitor.id']
      ).toEqual(['id2']);
    });

    it('handles pending configs', async () => {
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.msearch.mockResponseOnce({
        responses: [
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
          ]),
        ],
        took: 605,
      });
      expect(
        await queryMonitorStatus({
          esClient: syntheticsEsClient,
          monitorLocationIds: ['Europe - Germany', 'Asia/Pacific - Japan'],
          range: { from: 'now-12h', to: 'now' },
          monitorQueryIds: ['id1', 'id2', 'project-monitor-id', 'id4'],
          monitorLocationsMap: {
            id1: ['Asia/Pacific - Japan'],
            id2: ['Europe - Germany', 'Asia/Pacific - Japan'],
            'project-monitor-id': ['Europe - Germany', 'Asia/Pacific - Japan'],
            id4: ['Europe - Germany', 'Asia/Pacific - Japan'],
          },
          monitorQueryIdToConfigIdMap: {
            id1: 'id1',
            id2: 'id2',
            'project-monitor-id': 'id3',
            id4: 'id4',
          },
          monitors: [
            ...testMonitors,
            {
              attributes: {
                id: 'id4',
                enabled: true,
                type: 'browser',
                name: 'test monitor 4',
                project_id: 'project-id',
                tags: ['tag-1', 'tag-2'],
                schedule: {
                  number: '1',
                  unit: 'm',
                },
              },
            },
            {
              attributes: {
                id: 'project-monitor-id',
                enabled: true,
                type: 'browser',
                name: 'test monitor 3',
                project_id: 'project-id',
                tags: ['tag-1', 'tag-2'],
                schedule: {
                  number: '1',
                  unit: 'm',
                },
              },
            },
          ] as any,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "disabledConfigs": Object {},
          "down": 1,
          "downConfigs": Object {
            "id2-Europe - Germany": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Europe - Germany",
              "locationLabel": "Europe - Germany",
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "ping": Object {
                "@timestamp": "2022-09-15T16:19:16.724Z",
                "config_id": "id2",
                "monitor": Object {
                  "id": "id2",
                  "status": "down",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Europe - Germany",
                  },
                },
                "summary": Object {
                  "down": 1,
                  "up": 0,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "down",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:19:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
          },
          "enabledMonitorQueryIds": Array [
            "id1",
            "id2",
            "project-monitor-id",
            "id4",
          ],
          "pending": 4,
          "pendingConfigs": Object {
            "id3-Asia/Pacific - Japan": Object {
              "configId": "id3",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": undefined,
              "monitorQueryId": "project-monitor-id",
              "name": "test monitor 3",
              "projectId": "project-id",
              "schedule": "1",
              "status": "unknown",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "type": "browser",
              "updated_at": undefined,
            },
            "id3-Europe - Germany": Object {
              "configId": "id3",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Europe - Germany",
              "locationLabel": undefined,
              "monitorQueryId": "project-monitor-id",
              "name": "test monitor 3",
              "projectId": "project-id",
              "schedule": "1",
              "status": "unknown",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "type": "browser",
              "updated_at": undefined,
            },
            "id4-Asia/Pacific - Japan": Object {
              "configId": "id4",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": undefined,
              "monitorQueryId": "id4",
              "name": "test monitor 4",
              "projectId": "project-id",
              "schedule": "1",
              "status": "unknown",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "type": "browser",
              "updated_at": undefined,
            },
            "id4-Europe - Germany": Object {
              "configId": "id4",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Europe - Germany",
              "locationLabel": undefined,
              "monitorQueryId": "id4",
              "name": "test monitor 4",
              "projectId": "project-id",
              "schedule": "1",
              "status": "unknown",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "type": "browser",
              "updated_at": undefined,
            },
          },
          "up": 2,
          "upConfigs": Object {
            "id1-Asia/Pacific - Japan": Object {
              "configId": "id1",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": "Asia/Pacific - Japan",
              "monitorQueryId": "id1",
              "name": "test monitor 1",
              "ping": Object {
                "@timestamp": "2022-09-15T16:08:16.724Z",
                "config_id": "id1",
                "monitor": Object {
                  "id": "id1",
                  "status": "up",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Asia/Pacific - Japan",
                  },
                },
                "summary": Object {
                  "down": 0,
                  "up": 1,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "up",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:08:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
            "id2-Asia/Pacific - Japan": Object {
              "configId": "id2",
              "isEnabled": true,
              "isStatusAlertEnabled": false,
              "locationId": "Asia/Pacific - Japan",
              "locationLabel": "Asia/Pacific - Japan",
              "monitorQueryId": "id2",
              "name": "test monitor 2",
              "ping": Object {
                "@timestamp": "2022-09-15T16:09:16.724Z",
                "config_id": "id2",
                "monitor": Object {
                  "id": "id2",
                  "status": "up",
                },
                "observer": Object {
                  "geo": Object {
                    "name": "Asia/Pacific - Japan",
                  },
                },
                "summary": Object {
                  "down": 0,
                  "up": 1,
                },
              },
              "projectId": "project-id",
              "schedule": "1",
              "spaceId": undefined,
              "status": "up",
              "tags": Array [
                "tag-1",
                "tag-2",
              ],
              "timestamp": "2022-09-15T16:09:16.724Z",
              "type": "browser",
              "updated_at": undefined,
            },
          },
        }
      `);
    });
  });

  describe('getStatus', () => {
    it.each([
      [['US Central QA'], 1],
      [['North America - US Central'], 1],
      [['North America - US Central', 'US Central QA'], 2],
      [undefined, 2],
    ])('handles disabled count when using location filters', async (locations, disabledCount) => {
      const getAll = jest.fn().mockResolvedValue([
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
        } as unknown as SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>,
      ]);
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.msearch.mockResponseOnce({
        responses: [
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
          ]),
        ],
        took: 605,
      });
      const result = await getStatus(
        {
          syntheticsEsClient,
          savedObjectsClient: savedObjectsClientMock.create(),
          server: serverMock,
          monitorConfigRepository: {
            getAll,
          },
          request: { query: { locations } },
        } as unknown as RouteContext,
        {}
      );
      expect(result.disabledCount).toEqual(disabledCount);
    });

    it.each([
      [['US Central QA'], 1],
      [['North America - US Central'], 1],
      [['North America - US Central', 'US Central QA'], 2],
      [undefined, 2],
    ])('handles pending count when using location filters', async (locations, pending) => {
      const getAll = jest.fn().mockResolvedValue([
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
        } as unknown as SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>,
      ]);
      const { esClient, syntheticsEsClient } = getUptimeESMockClient();
      esClient.msearch.mockResponseOnce({ responses: [getEsResponse([])], took: 605 });
      const result = await getStatus(
        {
          syntheticsEsClient,
          savedObjectsClient: savedObjectsClientMock.create(),
          monitorConfigRepository: {
            getAll,
          },
          request: { query: { locations } },
        } as unknown as RouteContext,
        {}
      );
      expect(result.pending).toEqual(pending);
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

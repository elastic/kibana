/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertsAuthorizationMock } from '../../authorization/alerts_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { eventLogClientMock } from '../../../../event_log/server/mocks';
import { SavedObject } from 'kibana/server';
import { RawAlert } from '../../types';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';
import { RawEventLogAlertsSummary } from '../../lib/alert_instance_summary_from_event_log';

const taskManager = taskManagerMock.createStart();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertsAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

const kibanaVersion = 'v7.10.0';
const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  alertTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: (authorization as unknown) as AlertsAuthorization,
  actionsAuthorization: (actionsAuthorization as unknown) as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
};

beforeEach(() => {
  getBeforeSetup(alertsClientParams, taskManager, alertTypeRegistry, eventLogClient);
});

setGlobalDate();

const AlertInstanceSummaryIntervalSeconds = 1;

const BaseAlertInstanceSummarySavedObject: SavedObject<RawAlert> = {
  id: '1',
  type: 'alert',
  attributes: {
    enabled: true,
    name: 'alert-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'alert-consumer',
    schedule: { interval: `${AlertInstanceSummaryIntervalSeconds}s` },
    actions: [],
    params: {},
    createdBy: null,
    updatedBy: null,
    createdAt: mockedDateString,
    updatedAt: mockedDateString,
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
    notifyWhen: null,
    muteAll: false,
    mutedInstanceIds: [],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: '2020-08-20T19:23:38Z',
      error: null,
    },
  },
  references: [],
};

function getAlertInstanceSummarySavedObject(
  attributes: Partial<RawAlert> = {}
): SavedObject<RawAlert> {
  return {
    ...BaseAlertInstanceSummarySavedObject,
    attributes: { ...BaseAlertInstanceSummarySavedObject.attributes, ...attributes },
  };
}

describe('getAlertInstanceSummary()', () => {
  let alertsClient: AlertsClient;

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
  });

  test('runs as expected with some event log data', async () => {
    const alertSO = getAlertInstanceSummarySavedObject({
      mutedInstanceIds: ['instance-muted-no-activity'],
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(alertSO);

    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {},
      errors_state: {},
    };
    const summaryResult1 = [
      {
        savedObjectId: '',
        summary: instancesLatestStateSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult1);

    const instancesCreatedSummary = {
      instances: {},
    };
    const summaryResult2 = [
      {
        savedObjectId: '',
        summary: instancesCreatedSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult2);

    const dateStart = new Date(Date.now() - 60 * 1000).toISOString();

    const result = await alertsClient.getAlertInstanceSummary({ id: '1', dateStart });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "alertTypeId": "123",
        "consumer": "alert-consumer",
        "enabled": true,
        "errorMessages": Array [],
        "id": "1",
        "instances": Object {
          "instance-currently-active": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": "2019-02-12T21:01:22.479Z",
            "muted": false,
            "status": "Active",
          },
          "instance-muted-no-activity": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
          "instance-previously-active": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "OK",
          },
        },
        "lastRun": "2019-02-12T21:01:32.479Z",
        "muteAll": false,
        "name": "alert-name",
        "status": "Active",
        "statusEndDate": "2019-02-12T21:01:22.479Z",
        "statusStartDate": "2019-02-12T21:00:22.479Z",
        "tags": Array [
          "tag-1",
          "tag-2",
        ],
        "throttle": null,
      }
    `);
  });

  // Further tests don't check the result of `getAlertInstanceSummary()`, as the result
  // is just the result from the `alertInstanceSummaryFromEventLog()`, which itself
  // has a complete set of tests.  These tests just make sure the data gets
  // sent into `getAlertInstanceSummary()` as appropriate.

  test('calls saved objects and event log client with default params', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {},
      errors_state: {},
    };
    const summaryResult1 = [
      {
        savedObjectId: '',
        summary: instancesLatestStateSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult1);

    const instancesCreatedSummary = {
      instances: {},
    };
    const summaryResult2 = [
      {
        savedObjectId: '',
        summary: instancesCreatedSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult2);

    await alertsClient.getAlertInstanceSummary({ id: '1' });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.getEventsSummaryBySavedObjectIds).toHaveBeenCalledTimes(1);
    expect(eventLogClient.getEventsSummaryBySavedObjectIds.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alert",
        Array [
          "1",
        ],
        Object {
          "end": "2019-02-12T21:01:22.479Z",
          "page": 1,
          "per_page": 10000,
          "sort_order": "desc",
          "start": "2019-02-12T21:00:22.479Z",
        },
      ]
    `);
  });

  test('calls event log client with start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    const summaryResult = [
      {
        savedObjectId: 'e60004e0-65e1-11eb-96ec-3b8c9e2069b7',
        summary: {
          doc_count: 440,
          instances: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'host-11',
                doc_count: 49,
                last_state: {
                  doc_count: 49,
                  action: {
                    hits: {
                      total: {
                        value: 49,
                        relation: 'eq',
                      },
                      max_score: null,
                      hits: [
                        {
                          _index: '.kibana-event-log-8.0.0-000001',
                          _id: 'hvR9ZncBZvAf3rflOD0w',
                          _score: null,
                          _source: {
                            '@timestamp': '2021-02-03T06:03:38.212Z',
                            event: {
                              action: 'active-instance',
                            },
                            kibana: {
                              alerting: {
                                action_group_id: 'threshold met',
                              },
                            },
                          },
                          sort: [1612332218212],
                        },
                      ],
                    },
                  },
                },
                instance_created: {
                  doc_count: 0,
                  max_timestampt: {
                    value: null,
                  },
                },
              },
            ],
          },
        },
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult);

    const dateStart = new Date(
      Date.now() - 60 * AlertInstanceSummaryIntervalSeconds * 1000
    ).toISOString();
    await alertsClient.getAlertInstanceSummary({ id: '1', dateStart });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.getEventsSummaryBySavedObjectIds).toHaveBeenCalledTimes(1);
    const { start, end } = eventLogClient.getEventsSummaryBySavedObjectIds.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T21:00:22.479Z",
      }
    `);
  });

  test('calls event log client with relative start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {},
      errors_state: {},
    };
    const summaryResult1 = [
      {
        savedObjectId: '',
        summary: instancesLatestStateSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult1);

    const instancesCreatedSummary = {
      instances: {},
    };
    const summaryResult2 = [
      {
        savedObjectId: '',
        summary: instancesCreatedSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult2);

    const dateStart = '2m';
    await alertsClient.getAlertInstanceSummary({ id: '1', dateStart });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    const { start, end } = eventLogClient.getEventsSummaryBySavedObjectIds.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T20:59:22.479Z",
      }
    `);
  });

  test('invalid start date throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {},
      errors_state: {},
    };
    const summaryResult1 = [
      {
        savedObjectId: '',
        summary: instancesLatestStateSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult1);

    const instancesCreatedSummary = {
      instances: {},
    };
    const summaryResult2 = [
      {
        savedObjectId: '',
        summary: instancesCreatedSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult2);

    const dateStart = 'ain"t no way this will get parsed as a date';
    expect(
      alertsClient.getAlertInstanceSummary({ id: '1', dateStart })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateStart: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('saved object get throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('OMG!'));
    const instancesLatestStateSummary: RawEventLogAlertsSummary = {
      instances: {},
      last_execution_state: {},
      errors_state: {},
    };
    const summaryResult1 = [
      {
        savedObjectId: '',
        summary: instancesLatestStateSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult1);

    const instancesCreatedSummary = {
      instances: {},
    };
    const summaryResult2 = [
      {
        savedObjectId: '',
        summary: instancesCreatedSummary,
      },
    ];
    eventLogClient.getEventsSummaryBySavedObjectIds.mockResolvedValueOnce(summaryResult2);

    expect(alertsClient.getAlertInstanceSummary({ id: '1' })).rejects.toMatchInlineSnapshot(
      `[Error: OMG!]`
    );
  });

  test('findEvents throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    eventLogClient.getEventsSummaryBySavedObjectIds.mockRejectedValueOnce(new Error('OMG 2!'));

    // error eaten but logged
    await alertsClient.getAlertInstanceSummary({ id: '1' });
  });
});

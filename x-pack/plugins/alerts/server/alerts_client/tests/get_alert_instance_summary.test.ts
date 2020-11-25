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
import { QueryEventsBySavedObjectResult } from '../../../../event_log/server';
import { SavedObject } from 'kibana/server';
import { EventsFactory } from '../../lib/alert_instance_summary_from_event_log.test';
import { RawAlert } from '../../types';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';

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
  invalidateAPIKey: jest.fn(),
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

const AlertInstanceSummaryFindEventsResult: QueryEventsBySavedObjectResult = {
  page: 1,
  per_page: 10000,
  total: 0,
  data: [],
};

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
    apiKey: null,
    apiKeyOwner: null,
    throttle: null,
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

    const eventsFactory = new EventsFactory(mockedDateString);
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-currently-active')
      .addNewInstance('instance-previously-active')
      .addActiveInstance('instance-currently-active', 'action group A')
      .addActiveInstance('instance-previously-active', 'action group B')
      .advanceTime(10000)
      .addExecute()
      .addResolvedInstance('instance-previously-active')
      .addActiveInstance('instance-currently-active', 'action group A')
      .getEvents();
    const eventsResult = {
      ...AlertInstanceSummaryFindEventsResult,
      total: events.length,
      data: events,
    };
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(eventsResult);

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
            "activeStartDate": "2019-02-12T21:01:22.479Z",
            "muted": false,
            "status": "Active",
          },
          "instance-muted-no-activity": Object {
            "actionGroupId": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
          "instance-previously-active": Object {
            "actionGroupId": undefined,
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
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    await alertsClient.getAlertInstanceSummary({ id: '1' });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObject).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObject.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alert",
        "1",
        Object {
          "end": "2019-02-12T21:01:22.479Z",
          "page": 1,
          "per_page": 10000,
          "sort_order": "desc",
          "start": "2019-02-12T21:00:22.479Z",
        },
      ]
    `);
    // calculate the expected start/end date for one test
    const { start, end } = eventLogClient.findEventsBySavedObject.mock.calls[0][2]!;
    expect(end).toBe(mockedDateString);

    const startMillis = Date.parse(start!);
    const endMillis = Date.parse(end!);
    const expectedDuration = 60 * AlertInstanceSummaryIntervalSeconds * 1000;
    expect(endMillis - startMillis).toBeGreaterThan(expectedDuration - 2);
    expect(endMillis - startMillis).toBeLessThan(expectedDuration + 2);
  });

  test('calls event log client with start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    const dateStart = new Date(
      Date.now() - 60 * AlertInstanceSummaryIntervalSeconds * 1000
    ).toISOString();
    await alertsClient.getAlertInstanceSummary({ id: '1', dateStart });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObject).toHaveBeenCalledTimes(1);
    const { start, end } = eventLogClient.findEventsBySavedObject.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T21:00:22.479Z",
      }
    `);
  });

  test('calls event log client with relative start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    const dateStart = '2m';
    await alertsClient.getAlertInstanceSummary({ id: '1', dateStart });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObject).toHaveBeenCalledTimes(1);
    const { start, end } = eventLogClient.findEventsBySavedObject.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T20:59:22.479Z",
      }
    `);
  });

  test('invalid start date throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    const dateStart = 'ain"t no way this will get parsed as a date';
    expect(
      alertsClient.getAlertInstanceSummary({ id: '1', dateStart })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateStart: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('saved object get throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('OMG!'));
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    expect(alertsClient.getAlertInstanceSummary({ id: '1' })).rejects.toMatchInlineSnapshot(
      `[Error: OMG!]`
    );
  });

  test('findEvents throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertInstanceSummarySavedObject());
    eventLogClient.findEventsBySavedObject.mockRejectedValueOnce(new Error('OMG 2!'));

    // error eaten but logged
    await alertsClient.getAlertInstanceSummary({ id: '1' });
  });
});

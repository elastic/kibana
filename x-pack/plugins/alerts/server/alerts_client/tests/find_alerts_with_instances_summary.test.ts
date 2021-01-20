/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AlertsClient, ConstructorOptions } from '../alerts_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  httpServerMock,
} from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertsAuthorizationMock } from '../../authorization/alerts_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertsAuthorization } from '../../authorization/alerts_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { eventLogClientMock } from '../../../../event_log/server/mocks';
import { QueryEventsBySavedObjectResult } from '../../../../event_log/server';
import { SavedObject, SavedObjectsFindResult } from 'kibana/server';
import { EventsFactory } from '../../lib/alert_instance_summary_from_event_log.test';
import { RawAlert, RecoveredActionGroup } from '../../types';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';
import { auditServiceMock } from '../../../../security/server/audit/index.mock';
import { RegistryAlertType } from '../../alert_type_registry';

const taskManager = taskManagerMock.createStart();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertsAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditServiceMock.create().asScoped(httpServerMock.createKibanaRequest());

const kibanaVersion = 'v7.11.0';
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
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

const listedTypes = new Set<RegistryAlertType>([
  {
    actionGroups: [],
    recoveryActionGroup: RecoveredActionGroup,
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    minimumLicenseRequired: 'basic',
    id: 'myType',
    name: 'myType',
    producer: 'myApp',
    enabledInLicense: true,
  },
]);

const AlertInstanceSummaryFindEventsResult: QueryEventsBySavedObjectResult = {
  page: 1,
  per_page: 10000,
  total: 0,
  data: [],
};

const AlertInstanceSummaryIntervalSeconds = 1;

const BaseAlertInstanceSummarySavedObject: SavedObjectsFindResult<RawAlert> = {
  id: '1',
  type: 'alert',
  attributes: {
    enabled: true,
    name: 'alert-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: 'myType',
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
  score: 1,
};

function findAlertsInstanceSummarySavedObject(
  attributes: Partial<RawAlert> = {}
): SavedObjectsFindResult<RawAlert> {
  return {
    ...BaseAlertInstanceSummarySavedObject,
    attributes: { ...BaseAlertInstanceSummarySavedObject.attributes, ...attributes },
  };
}

describe('findAlertsWithInstancesSummary()', () => {
  let alertsClient: AlertsClient;

  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureAlertTypeIsAuthorized() {},
      logSuccessfulAuthorization() {},
    });

    alertTypeRegistry.list.mockReturnValue(listedTypes);
    authorization.filterByAlertTypeAuthorization.mockResolvedValue(
      new Set([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          recoveryActionGroup: RecoveredActionGroup,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
          enabledInLicense: true,
        },
      ])
    );
    alertsClient = new AlertsClient(alertsClientParams);
  });

  test('runs as expected with some event log data', async () => {
    const alertSO = findAlertsInstanceSummarySavedObject({
      mutedInstanceIds: ['instance-muted-no-activity'],
    });

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [{ ...alertSO }],
    });

    const eventsFactory = new EventsFactory(mockedDateString);
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-currently-active')
      .addNewInstance('instance-previously-active')
      .addActiveInstance('instance-currently-active', 'action group A')
      .addActiveInstance('instance-previously-active', 'action group B')
      .advanceTime(10000)
      .addExecute()
      .addRecoveredInstance('instance-previously-active')
      .addActiveInstance('instance-currently-active', 'action group A')
      .getEvents();
    const eventsResult = {
      ...AlertInstanceSummaryFindEventsResult,
      total: events.length,
      data: events,
    };
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValue(eventsResult);

    const dateStart = new Date(Date.now() - 60 * 1000).toISOString();

    const result = await alertsClient.findAlertsWithInstancesSummary({
      options: { searchFields: ['consumer'], search: 'alert-consumer', dateStart },
    });
    expect(result).toMatchInlineSnapshot(`
    Object {
      "data": Array [
        Object {
          "alertTypeId": "myType",
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
        },
      ],
      "page": 1,
      "perPage": 10,
      "total": 1,
    }
    `);
  });

  test('calls saved objects and event log client with default params', async () => {
    const alertSO = findAlertsInstanceSummarySavedObject();

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [{ ...alertSO }],
    });
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce({
      page: 1,
      per_page: 10000,
      total: 1,
      data: [],
    });

    await alertsClient.findAlertsWithInstancesSummary({ options: {} });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(2);
    expect(eventLogClient.findEventsBySavedObjectIds.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alert",
        Array [
          "1",
        ],
        Object {
          "end": "2019-02-12T21:01:22.479Z",
          "page": 1,
          "per_page": 0,
          "start": "2019-02-12T21:00:22.479Z",
        },
      ]
    `);
    // calculate the expected start/end date for one test
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[0][2]!;
    expect(end).toBe(mockedDateString);

    const startMillis = Date.parse(start!);
    const endMillis = Date.parse(end!);
    const expectedDuration = 60 * AlertInstanceSummaryIntervalSeconds * 1000;
    expect(endMillis - startMillis).toBeGreaterThan(expectedDuration - 2);
    expect(endMillis - startMillis).toBeLessThan(expectedDuration + 2);
  });

  test('calls event log client with start date', async () => {
    const alertSO = findAlertsInstanceSummarySavedObject();

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [{ ...alertSO }],
    });
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    const dateStart = new Date(
      Date.now() - 60 * AlertInstanceSummaryIntervalSeconds * 1000
    ).toISOString();
    await alertsClient.findAlertsWithInstancesSummary({ options: { dateStart } });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T21:00:22.479Z",
      }
    `);
  });

  test('calls event log client with relative start date', async () => {
    const alertSO = findAlertsInstanceSummarySavedObject();

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [{ ...alertSO }],
    });
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    const dateStart = '2m';
    await alertsClient.findAlertsWithInstancesSummary({ options: { dateStart } });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(1);
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T20:59:22.479Z",
      }
    `);
  });

  test('invalid start date throws an error', async () => {
    const alertSO = findAlertsInstanceSummarySavedObject();

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [{ ...alertSO }],
    });
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    const dateStart = 'ain"t no way this will get parsed as a date';
    expect(
      alertsClient.findAlertsWithInstancesSummary({ options: { dateStart } })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateStart: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('saved object get throws an error', async () => {
    unsecuredSavedObjectsClient.find.mockRejectedValueOnce(new Error('OMG!'));
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(
      AlertInstanceSummaryFindEventsResult
    );

    expect(
      alertsClient.findAlertsWithInstancesSummary({ options: {} })
    ).rejects.toMatchInlineSnapshot(`[Error: OMG!]`);
  });

  test('findEvents throws an error', async () => {
    const alertSO = findAlertsInstanceSummarySavedObject();

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [{ ...alertSO }],
    });
    eventLogClient.findEventsBySavedObjectIds.mockRejectedValueOnce(new Error('OMG 2!'));

    // error eaten but logged
    await alertsClient.findAlertsWithInstancesSummary({ options: {} });
  });
});

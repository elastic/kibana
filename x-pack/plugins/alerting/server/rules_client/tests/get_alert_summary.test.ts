/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, mean } from 'lodash';
import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/mocks';
import { QueryEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import { SavedObject } from '@kbn/core/server';
import { EventsFactory } from '../../lib/alert_summary_from_event_log.test';
import { RawRule } from '../../types';
import { getBeforeSetup, mockedDateString, setGlobalDate } from './lib';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry, eventLogClient);
});

setGlobalDate();

const AlertSummaryFindEventsResult: QueryEventsBySavedObjectResult = {
  page: 1,
  per_page: 10000,
  total: 0,
  data: [],
};

const RuleIntervalSeconds = 1;

const BaseRuleSavedObject: SavedObject<RawRule> = {
  id: '1',
  type: 'alert',
  attributes: {
    enabled: true,
    name: 'rule-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'rule-consumer',
    legacyId: null,
    schedule: { interval: `${RuleIntervalSeconds}s` },
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
      warning: null,
    },
  },
  references: [],
};

function getRuleSavedObject(attributes: Partial<RawRule> = {}): SavedObject<RawRule> {
  return {
    ...BaseRuleSavedObject,
    attributes: { ...BaseRuleSavedObject.attributes, ...attributes },
  };
}

describe('getAlertSummary()', () => {
  let rulesClient: RulesClient;

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
  });

  test('runs as expected with some event log data', async () => {
    const ruleSO = getRuleSavedObject({
      mutedInstanceIds: ['alert-muted-no-activity'],
    });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(ruleSO);

    const eventsFactory = new EventsFactory(mockedDateString);
    const events = eventsFactory
      .addExecute()
      .addNewAlert('alert-currently-active')
      .addNewAlert('alert-previously-active')
      .addActiveAlert('alert-currently-active', 'action group A')
      .addActiveAlert('alert-previously-active', 'action group B')
      .advanceTime(10000)
      .addExecute()
      .addRecoveredAlert('alert-previously-active')
      .addActiveAlert('alert-currently-active', 'action group A')
      .getEvents();
    const eventsResult = {
      ...AlertSummaryFindEventsResult,
      total: events.length,
      data: events,
    };
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(eventsResult);

    const executionEvents = eventsFactory.getEvents();
    const executionEventsResult = {
      ...AlertSummaryFindEventsResult,
      total: executionEvents.length,
      data: executionEvents,
    };
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(executionEventsResult);

    const dateStart = new Date(Date.now() - 60 * 1000).toISOString();

    const durations: Record<string, number> = eventsFactory.getExecutionDurations();

    const result = await rulesClient.getAlertSummary({ id: '1', dateStart });
    const resultWithoutExecutionDuration = omit(result, 'executionDuration');
    expect(resultWithoutExecutionDuration).toMatchInlineSnapshot(`
      Object {
        "alerts": Object {
          "alert-currently-active": Object {
            "actionGroupId": "action group A",
            "actionSubgroup": undefined,
            "activeStartDate": "2019-02-12T21:01:22.479Z",
            "muted": false,
            "status": "Active",
          },
          "alert-muted-no-activity": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
          "alert-previously-active": Object {
            "actionGroupId": undefined,
            "actionSubgroup": undefined,
            "activeStartDate": undefined,
            "muted": false,
            "status": "OK",
          },
        },
        "consumer": "rule-consumer",
        "enabled": true,
        "errorMessages": Array [],
        "id": "1",
        "lastRun": "2019-02-12T21:01:32.479Z",
        "muteAll": false,
        "name": "rule-name",
        "ruleTypeId": "123",
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

    expect(result.executionDuration).toEqual({
      average: Math.round(mean(Object.values(durations))),
      valuesWithTimestamp: durations,
    });
  });

  // Further tests don't check the result of `getAlertSummary()`, as the result
  // is just the result from the `alertSummaryFromEventLog()`, which itself
  // has a complete set of tests.  These tests just make sure the data gets
  // sent into `getAlertSummary()` as appropriate.

  test('calls saved objects and event log client with default params', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    await rulesClient.getAlertSummary({ id: '1' });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
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
          "per_page": 10000,
          "sort": Array [
            Object {
              "sort_field": "@timestamp",
              "sort_order": "desc",
            },
          ],
          "start": "2019-02-12T21:00:22.479Z",
        },
        undefined,
      ]
    `);
    // calculate the expected start/end date for one test
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[0][2]!;
    expect(end).toBe(mockedDateString);

    const startMillis = Date.parse(start!);
    const endMillis = Date.parse(end!);
    const expectedDuration = 60 * RuleIntervalSeconds * 1000;
    expect(endMillis - startMillis).toBeGreaterThan(expectedDuration - 2);
    expect(endMillis - startMillis).toBeLessThan(expectedDuration + 2);
  });

  test('calls event log client with legacy ids param', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(
      getRuleSavedObject({ legacyId: '99999' })
    );
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    await rulesClient.getAlertSummary({ id: '1' });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
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
          "per_page": 10000,
          "sort": Array [
            Object {
              "sort_field": "@timestamp",
              "sort_order": "desc",
            },
          ],
          "start": "2019-02-12T21:00:22.479Z",
        },
        Array [
          "99999",
        ],
      ]
    `);
  });

  test('calls event log client with start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    const dateStart = new Date(Date.now() - 60 * RuleIntervalSeconds * 1000).toISOString();
    await rulesClient.getAlertSummary({ id: '1', dateStart });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(2);
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T21:00:22.479Z",
      }
    `);
  });

  test('calls event log client with relative start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    const dateStart = '2m';
    await rulesClient.getAlertSummary({ id: '1', dateStart });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(2);
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[0][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": "2019-02-12T20:59:22.479Z",
      }
    `);
  });

  test('calls event log client with number of executions', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    const numberOfExecutions = 15;
    await rulesClient.getAlertSummary({ id: '1', numberOfExecutions });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(eventLogClient.findEventsBySavedObjectIds).toHaveBeenCalledTimes(2);
    const { start, end } = eventLogClient.findEventsBySavedObjectIds.mock.calls[1][2]!;

    expect({ start, end }).toMatchInlineSnapshot(`
      Object {
        "end": "2019-02-12T21:01:22.479Z",
        "start": undefined,
      }
    `);
  });

  test('invalid start date throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    const dateStart = 'ain"t no way this will get parsed as a date';
    expect(rulesClient.getAlertSummary({ id: '1', dateStart })).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateStart: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('saved object get throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('OMG!'));
    eventLogClient.findEventsBySavedObjectIds.mockResolvedValueOnce(AlertSummaryFindEventsResult);

    expect(rulesClient.getAlertSummary({ id: '1' })).rejects.toMatchInlineSnapshot(`[Error: OMG!]`);
  });

  test('findEvents throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getRuleSavedObject());
    eventLogClient.findEventsBySavedObjectIds.mockRejectedValueOnce(new Error('OMG 2!'));

    // error eaten but logged
    await rulesClient.getAlertSummary({ id: '1' });
  });
});

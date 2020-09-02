/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { AlertsClient, CreateOptions, ConstructorOptions } from './alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../src/core/server/mocks';
import { taskManagerMock } from '../../task_manager/server/task_manager.mock';
import { alertTypeRegistryMock } from './alert_type_registry.mock';
import { alertsAuthorizationMock } from './authorization/alerts_authorization.mock';
import { TaskStatus } from '../../task_manager/server';
import { IntervalSchedule, RawAlert } from './types';
import { resolvable } from './test_utils';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { actionsClientMock, actionsAuthorizationMock } from '../../actions/server/mocks';
import { AlertsAuthorization } from './authorization/alerts_authorization';
import { ActionsAuthorization } from '../../actions/server';
import { eventLogClientMock } from '../../event_log/server/mocks';
import { QueryEventsBySavedObjectResult } from '../../event_log/server';
import { SavedObject } from 'kibana/server';
import { EventsFactory } from './lib/alert_status_from_event_log.test';

const taskManager = taskManagerMock.start();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const eventLogClient = eventLogClientMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertsAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();

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
};

beforeEach(() => {
  jest.resetAllMocks();
  alertsClientParams.createAPIKey.mockResolvedValue({ apiKeysEnabled: false });
  alertsClientParams.invalidateAPIKey.mockResolvedValue({
    apiKeysEnabled: true,
    result: {
      invalidated_api_keys: [],
      previously_invalidated_api_keys: [],
      error_count: 0,
    },
  });
  alertsClientParams.getUserName.mockResolvedValue('elastic');
  taskManager.runNow.mockResolvedValue({ id: '' });
  const actionsClient = actionsClientMock.create();
  actionsClient.getBulk.mockResolvedValueOnce([
    {
      id: '1',
      isPreconfigured: false,
      actionTypeId: 'test',
      name: 'test',
      config: {
        foo: 'bar',
      },
    },
    {
      id: '2',
      isPreconfigured: false,
      actionTypeId: 'test2',
      name: 'test2',
      config: {
        foo: 'bar',
      },
    },
    {
      id: 'testPreconfigured',
      actionTypeId: '.slack',
      isPreconfigured: true,
      name: 'test',
    },
  ]);
  alertsClientParams.getActionsClient.mockResolvedValue(actionsClient);

  alertTypeRegistry.get.mockImplementation((id) => ({
    id: '123',
    name: 'Test',
    actionGroups: [{ id: 'default', name: 'Default' }],
    defaultActionGroupId: 'default',
    async executor() {},
    producer: 'alerts',
  }));
  alertsClientParams.getEventLogClient.mockResolvedValue(eventLogClient);
});

const mockedDateString = '2019-02-12T21:01:22.479Z';
const mockedDate = new Date(mockedDateString);
const DateOriginal = Date;

// A version of date that responds to `new Date(null|undefined)` and `Date.now()`
// by returning a fixed date, otherwise should be same as Date.
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
(global as any).Date = class Date {
  constructor(...args: unknown[]) {
    // sometimes the ctor has no args, sometimes has a single `null` arg
    if (args[0] == null) {
      // @ts-ignore
      return mockedDate;
    } else {
      // @ts-ignore
      return new DateOriginal(...args);
    }
  }
  static now() {
    return mockedDate.getTime();
  }
  static parse(string: string) {
    return DateOriginal.parse(string);
  }
};

function getMockData(overwrites: Record<string, unknown> = {}): CreateOptions['data'] {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    alertTypeId: '123',
    consumer: 'bar',
    schedule: { interval: '10s' },
    throttle: null,
    params: {
      bar: true,
    },
    actions: [
      {
        group: 'default',
        id: '1',
        params: {
          foo: true,
        },
      },
    ],
    ...overwrites,
  };
}

describe('create()', () => {
  let alertsClient: AlertsClient;

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
  });

  describe('authorization', () => {
    function tryToExecuteOperation(options: CreateOptions): Promise<unknown> {
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'action',
            attributes: {
              actions: [],
              actionTypeId: 'test',
            },
            references: [],
          },
        ],
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          createdAt: '2019-02-12T21:01:22.479Z',
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              actionTypeId: 'test',
              params: {
                foo: true,
              },
            },
          ],
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      });
      taskManager.schedule.mockResolvedValueOnce({
        id: 'task-123',
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {},
        params: {},
        ownerId: null,
      });
      unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [],
          scheduledTaskId: 'task-123',
        },
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      });

      return alertsClient.create(options);
    }

    test('ensures user is authorised to create this type of alert under the consumer', async () => {
      const data = getMockData({
        alertTypeId: 'myType',
        consumer: 'myApp',
      });

      await tryToExecuteOperation({ data });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'create');
    });

    test('throws when user is not authorised to create this type of alert', async () => {
      const data = getMockData({
        alertTypeId: 'myType',
        consumer: 'myApp',
      });

      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to create a "myType" alert for "myApp"`)
      );

      await expect(tryToExecuteOperation({ data })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to create a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'create');
    });
  });

  test('creates an alert', async () => {
    const data = getMockData();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: '2019-02-12T21:01:22.479Z',
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          id: '1',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
    const result = await alertsClient.create({ data });
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith('123', 'bar', 'create');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toHaveLength(3);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "apiKey": null,
        "apiKeyOwner": null,
        "consumer": "bar",
        "createdAt": "2019-02-12T21:01:22.479Z",
        "createdBy": "elastic",
        "enabled": true,
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
                                                                                                                  Object {
                                                                                                                    "references": Array [
                                                                                                                      Object {
                                                                                                                        "id": "1",
                                                                                                                        "name": "action_0",
                                                                                                                        "type": "action",
                                                                                                                      },
                                                                                                                    ],
                                                                                                                  }
                                                                            `);
    expect(taskManager.schedule).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule.mock.calls[0]).toMatchInlineSnapshot(`
                                                                        Array [
                                                                          Object {
                                                                            "params": Object {
                                                                              "alertId": "1",
                                                                              "spaceId": "default",
                                                                            },
                                                                            "scope": Array [
                                                                              "alerting",
                                                                            ],
                                                                            "state": Object {
                                                                              "alertInstances": Object {},
                                                                              "alertTypeState": Object {},
                                                                              "previousStartedAt": null,
                                                                            },
                                                                            "taskType": "alerting:123",
                                                                          },
                                                                        ]
                                                `);
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0]).toHaveLength(3);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
                                                                                                                  Object {
                                                                                                                    "scheduledTaskId": "task-123",
                                                                                                                  }
                                                                            `);
  });

  test('creates an alert with multiple actions', async () => {
    const data = getMockData({
      actions: [
        {
          group: 'default',
          id: '1',
          params: {
            foo: true,
          },
        },
        {
          group: 'default',
          id: '1',
          params: {
            foo: true,
          },
        },
        {
          group: 'default',
          id: '2',
          params: {
            foo: true,
          },
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        scheduledTaskId: 'task-123',
      },
      references: [],
    });
    const result = await alertsClient.create({ data });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test2",
            "group": "default",
            "id": "2",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
  });

  test('creates a disabled alert', async () => {
    const data = getMockData({ enabled: false });
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        alertTypeId: '123',
        schedule: { interval: 10000 },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.create({ data });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": false,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": 10000,
        },
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule).toHaveBeenCalledTimes(0);
  });

  test('should trim alert name when creating API key', async () => {
    const data = getMockData({ name: ' my alert name ' });
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        name: ' my alert name ',
        alertTypeId: '123',
        schedule: { interval: 10000 },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });

    await alertsClient.create({ data });
    expect(alertsClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: 123/my alert name');
  });

  test('should validate params', async () => {
    const data = getMockData();
    alertTypeRegistry.get.mockReturnValue({
      id: '123',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      validate: {
        params: schema.object({
          param1: schema.string(),
          threshold: schema.number({ min: 0, max: 1 }),
        }),
      },
      async executor() {},
      producer: 'alerts',
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('throws error if loading actions fails', async () => {
    const data = getMockData();
    const actionsClient = actionsClientMock.create();
    actionsClient.getBulk.mockRejectedValueOnce(new Error('Test Error'));
    alertsClientParams.getActionsClient.mockResolvedValue(actionsClient);
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test Error"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error if create saved object fails', async () => {
    const data = getMockData();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Test failure'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('attempts to remove saved object if scheduling failed', async () => {
    const data = getMockData();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockRejectedValueOnce(new Error('Test failure'));
    unsecuredSavedObjectsClient.delete.mockResolvedValueOnce({});
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test('returns task manager error if cleanup fails, logs to console', async () => {
    const data = getMockData();
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockRejectedValueOnce(new Error('Task manager error'));
    unsecuredSavedObjectsClient.delete.mockRejectedValueOnce(
      new Error('Saved object delete error')
    );
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Task manager error"`
    );
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to cleanup alert "1" after scheduling task failed. Error: Saved object delete error'
    );
  });

  test('throws an error if alert type not registerd', async () => {
    const data = getMockData();
    alertTypeRegistry.get.mockImplementation(() => {
      throw new Error('Invalid type');
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid type"`
    );
  });

  test('calls the API key function', async () => {
    const data = getMockData();
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          id: '1',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
    await alertsClient.create({ data });

    expect(alertsClientParams.createAPIKey).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        actions: [
          {
            actionRef: 'action_0',
            group: 'default',
            actionTypeId: 'test',
            params: { foo: true },
          },
        ],
        alertTypeId: '123',
        consumer: 'bar',
        name: 'abc',
        params: { bar: true },
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        createdBy: 'elastic',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        enabled: true,
        schedule: { interval: '10s' },
        throttle: null,
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
      },
      {
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      }
    );
  });

  test(`doesn't create API key for disabled alerts`, async () => {
    const data = getMockData({ enabled: false });
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    taskManager.schedule.mockResolvedValueOnce({
      id: 'task-123',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          id: '1',
          name: 'action_0',
          type: 'action',
        },
      ],
    });
    await alertsClient.create({ data });

    expect(alertsClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        actions: [
          {
            actionRef: 'action_0',
            group: 'default',
            actionTypeId: 'test',
            params: { foo: true },
          },
        ],
        alertTypeId: '123',
        consumer: 'bar',
        name: 'abc',
        params: { bar: true },
        apiKey: null,
        apiKeyOwner: null,
        createdBy: 'elastic',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        enabled: false,
        schedule: { interval: '10s' },
        throttle: null,
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
      },
      {
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      }
    );
  });
});

describe('enable()', () => {
  let alertsClient: AlertsClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      consumer: 'myApp',
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      enabled: false,
      actions: [
        {
          group: 'default',
          id: '1',
          actionTypeId: '1',
          actionRef: '1',
          params: {
            foo: true,
          },
        },
      ],
    },
    version: '123',
    references: [],
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingAlert);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    alertsClientParams.createAPIKey.mockResolvedValue({
      apiKeysEnabled: false,
    });
    taskManager.schedule.mockResolvedValue({
      id: 'task-123',
      scheduledAt: new Date(),
      attempts: 0,
      status: TaskStatus.Idle,
      runAt: new Date(),
      state: {},
      params: {},
      taskType: '',
      startedAt: null,
      retryAt: null,
      ownerId: null,
    });
  });

  describe('authorization', () => {
    beforeEach(() => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingAlert);
      unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
      alertsClientParams.createAPIKey.mockResolvedValue({
        apiKeysEnabled: false,
      });
      taskManager.schedule.mockResolvedValue({
        id: 'task-123',
        scheduledAt: new Date(),
        attempts: 0,
        status: TaskStatus.Idle,
        runAt: new Date(),
        state: {},
        params: {},
        taskType: '',
        startedAt: null,
        retryAt: null,
        ownerId: null,
      });
    });

    test('ensures user is authorised to enable this type of alert under the consumer', async () => {
      await alertsClient.enable({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'enable');
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to enable this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to enable a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.enable({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to enable a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'enable');
    });
  });

  test('enables an alert', async () => {
    await alertsClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
    expect(alertsClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        updatedBy: 'elastic',
        apiKey: null,
        apiKeyOwner: null,
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      {
        version: '123',
      }
    );
    expect(taskManager.schedule).toHaveBeenCalledWith({
      taskType: `alerting:myType`,
      params: {
        alertId: '1',
        spaceId: 'default',
      },
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      scheduledTaskId: 'task-123',
    });
  });

  test('invalidates API key if ever one existed prior to updating', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
    });

    await alertsClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
  });

  test(`doesn't enable already enabled alerts`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        enabled: true,
      },
    });

    await alertsClient.enable({ id: '1' });
    expect(alertsClientParams.getUserName).not.toHaveBeenCalled();
    expect(alertsClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('sets API key when createAPIKey returns one', async () => {
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });

    await alertsClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedBy: 'elastic',
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      {
        version: '123',
      }
    );
  });

  test('falls back when failing to getDecryptedAsInternalUser', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await alertsClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'enable(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test('throws error when failing to load the saved object using SOC', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('Fail to get'));

    await expect(alertsClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to get"`
    );
    expect(alertsClientParams.getUserName).not.toHaveBeenCalled();
    expect(alertsClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error when failing to update the first time', async () => {
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Fail to update'));

    await expect(alertsClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update"`
    );
    expect(alertsClientParams.getUserName).toHaveBeenCalled();
    expect(alertsClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error when failing to update the second time', async () => {
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        enabled: true,
      },
    });
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(
      new Error('Fail to update second time')
    );

    await expect(alertsClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update second time"`
    );
    expect(alertsClientParams.getUserName).toHaveBeenCalled();
    expect(alertsClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.schedule).toHaveBeenCalled();
  });

  test('throws error when failing to schedule task', async () => {
    taskManager.schedule.mockRejectedValueOnce(new Error('Fail to schedule'));

    await expect(alertsClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to schedule"`
    );
    expect(alertsClientParams.getUserName).toHaveBeenCalled();
    expect(alertsClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
  });
});

describe('disable()', () => {
  let alertsClient: AlertsClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      consumer: 'myApp',
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      enabled: true,
      scheduledTaskId: 'task-123',
      actions: [
        {
          group: 'default',
          id: '1',
          actionTypeId: '1',
          actionRef: '1',
          params: {
            foo: true,
          },
        },
      ],
    },
    version: '123',
    references: [],
  };
  const existingDecryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedAlert);
  });

  describe('authorization', () => {
    test('ensures user is authorised to disable this type of alert under the consumer', async () => {
      await alertsClient.disable({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'disable');
    });

    test('throws when user is not authorised to disable this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to disable a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.disable({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to disable a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'disable');
    });
  });

  test('disables an alert', async () => {
    await alertsClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        consumer: 'myApp',
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        apiKey: null,
        apiKeyOwner: null,
        enabled: false,
        scheduledTaskId: null,
        updatedBy: 'elastic',
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      {
        version: '123',
      }
    );
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
  });

  test('falls back when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        consumer: 'myApp',
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        apiKey: null,
        apiKeyOwner: null,
        enabled: false,
        scheduledTaskId: null,
        updatedBy: 'elastic',
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      {
        version: '123',
      }
    );
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test(`doesn't disable already disabled alerts`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingDecryptedAlert,
      attributes: {
        ...existingDecryptedAlert.attributes,
        actions: [],
        enabled: false,
      },
    });

    await alertsClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(taskManager.remove).not.toHaveBeenCalled();
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test(`doesn't invalidate when no API key is used`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce(existingAlert);

    await alertsClient.disable({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test('swallows error when failing to load decrypted saved object', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(taskManager.remove).toHaveBeenCalled();
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'disable(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test('throws when unsecuredSavedObjectsClient update fails', async () => {
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Failed to update'));

    await expect(alertsClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update"`
    );
  });

  test('swallows error when invalidate API key throws', async () => {
    alertsClientParams.invalidateAPIKey.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.disable({ id: '1' });
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to invalidate API Key: Fail'
    );
  });

  test('throws when failing to remove task from task manager', async () => {
    taskManager.remove.mockRejectedValueOnce(new Error('Failed to remove task'));

    await expect(alertsClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to remove task"`
    );
  });
});

describe('muteAll()', () => {
  test('mutes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
        muteAll: false,
      },
      references: [],
    });

    await alertsClient.muteAll({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      muteAll: true,
      mutedInstanceIds: [],
      updatedBy: 'elastic',
    });
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          consumer: 'myApp',
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          apiKey: null,
          apiKeyOwner: null,
          enabled: false,
          scheduledTaskId: null,
          updatedBy: 'elastic',
          muteAll: false,
        },
        references: [],
      });
    });

    test('ensures user is authorised to muteAll this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.muteAll({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'muteAll');
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to muteAll this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to muteAll a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.muteAll({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to muteAll a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'muteAll');
    });
  });
});

describe('unmuteAll()', () => {
  test('unmutes an alert', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
        muteAll: true,
      },
      references: [],
    });

    await alertsClient.unmuteAll({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      muteAll: false,
      mutedInstanceIds: [],
      updatedBy: 'elastic',
    });
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          consumer: 'myApp',
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          apiKey: null,
          apiKeyOwner: null,
          enabled: false,
          scheduledTaskId: null,
          updatedBy: 'elastic',
          muteAll: false,
        },
        references: [],
      });
    });

    test('ensures user is authorised to unmuteAll this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.unmuteAll({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'unmuteAll');
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to unmuteAll this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to unmuteAll a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.unmuteAll({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to unmuteAll a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'unmuteAll');
    });
  });
});

describe('muteInstance()', () => {
  test('mutes an alert instance', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
      },
      version: '123',
      references: [],
    });

    await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: ['2'],
        updatedBy: 'elastic',
      },
      { version: '123' }
    );
  });

  test('skips muting when alert instance already muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2'],
      },
      references: [],
    });

    await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  test('skips muting when alert is muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [],
    });

    await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          schedule: { interval: '10s' },
          alertTypeId: 'myType',
          consumer: 'myApp',
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: [],
        },
        version: '123',
        references: [],
      });
    });

    test('ensures user is authorised to muteInstance this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'muteInstance'
      );
    });

    test('throws when user is not authorised to muteInstance this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to muteInstance a "myType" alert for "myApp"`)
      );

      await expect(
        alertsClient.muteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to muteInstance a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'muteInstance'
      );
    });
  });
});

describe('unmuteInstance()', () => {
  test('unmutes an alert instance', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: ['2'],
      },
      version: '123',
      references: [],
    });

    await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        mutedInstanceIds: [],
        updatedBy: 'elastic',
      },
      { version: '123' }
    );
  });

  test('skips unmuting when alert instance not muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
      },
      references: [],
    });

    await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  test('skips unmuting when alert is muted', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        schedule: { interval: '10s' },
        alertTypeId: '2',
        enabled: true,
        scheduledTaskId: 'task-123',
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [],
    });

    await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          actions: [
            {
              group: 'default',
              id: '1',
              actionTypeId: '1',
              actionRef: '1',
              params: {
                foo: true,
              },
            },
          ],
          alertTypeId: 'myType',
          consumer: 'myApp',
          schedule: { interval: '10s' },
          enabled: true,
          scheduledTaskId: 'task-123',
          mutedInstanceIds: ['2'],
        },
        version: '123',
        references: [],
      });
    });

    test('ensures user is authorised to unmuteInstance this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'unmuteInstance'
      );
    });

    test('throws when user is not authorised to unmuteInstance this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to unmuteInstance a "myType" alert for "myApp"`)
      );

      await expect(
        alertsClient.unmuteInstance({ alertId: '1', alertInstanceId: '2' })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to unmuteInstance a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'unmuteInstance'
      );
    });
  });
});

describe('get()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.get({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "123",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test(`throws an error when references aren't found`, async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [],
    });
    await expect(alertsClient.get({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action reference \\"action_0\\" not found in alert id: 1"`
    );
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          alertTypeId: 'myType',
          consumer: 'myApp',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      });
    });

    test('ensures user is authorised to get this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.get({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'get');
    });

    test('throws when user is not authorised to get this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.get({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'get');
    });
  });
});

describe('getAlertState()', () => {
  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });

    taskManager.get.mockResolvedValueOnce({
      id: '1',
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {},
      ownerId: null,
    });

    await alertsClient.getAlertState({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test('gets the underlying task from TaskManager', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);

    const scheduledTaskId = 'task-123';

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
        enabled: true,
        scheduledTaskId,
        mutedInstanceIds: [],
        muteAll: true,
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });

    taskManager.get.mockResolvedValueOnce({
      id: scheduledTaskId,
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {},
      params: {
        alertId: '1',
      },
      ownerId: null,
    });

    await alertsClient.getAlertState({ id: '1' });
    expect(taskManager.get).toHaveBeenCalledTimes(1);
    expect(taskManager.get).toHaveBeenCalledWith(scheduledTaskId);
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          alertTypeId: 'myType',
          consumer: 'myApp',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      });

      taskManager.get.mockResolvedValueOnce({
        id: '1',
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {},
        params: {},
        ownerId: null,
      });
    });

    test('ensures user is authorised to get this type of alert under the consumer', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.getAlertState({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'getAlertState'
      );
    });

    test('throws when user is not authorised to getAlertState this type of alert', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      // `get` check
      authorization.ensureAuthorized.mockResolvedValueOnce();
      // `getAlertState` check
      authorization.ensureAuthorized.mockRejectedValueOnce(
        new Error(`Unauthorized to getAlertState a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.getAlertState({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to getAlertState a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'getAlertState'
      );
    });
  });
});

const AlertStatusFindEventsResult: QueryEventsBySavedObjectResult = {
  page: 1,
  per_page: 10000,
  total: 0,
  data: [],
};

const AlertStatusIntervalSeconds = 1;

const BaseAlertStatusSavedObject: SavedObject<RawAlert> = {
  id: '1',
  type: 'alert',
  attributes: {
    enabled: true,
    name: 'alert-name',
    tags: ['tag-1', 'tag-2'],
    alertTypeId: '123',
    consumer: 'alert-consumer',
    schedule: { interval: `${AlertStatusIntervalSeconds}s` },
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
  },
  references: [],
};

function getAlertStatusSavedObject(attributes: Partial<RawAlert> = {}): SavedObject<RawAlert> {
  return {
    ...BaseAlertStatusSavedObject,
    attributes: { ...BaseAlertStatusSavedObject.attributes, ...attributes },
  };
}

describe('getAlertStatus()', () => {
  let alertsClient: AlertsClient;

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
  });

  test('runs as expected with some event log data', async () => {
    const alertSO = getAlertStatusSavedObject({ mutedInstanceIds: ['instance-muted-no-activity'] });
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(alertSO);

    const eventsFactory = new EventsFactory(mockedDateString);
    const events = eventsFactory
      .addExecute()
      .addNewInstance('instance-currently-active')
      .addNewInstance('instance-previously-active')
      .addActiveInstance('instance-currently-active')
      .addActiveInstance('instance-previously-active')
      .advanceTime(10000)
      .addExecute()
      .addResolvedInstance('instance-previously-active')
      .addActiveInstance('instance-currently-active')
      .getEvents();
    const eventsResult = {
      ...AlertStatusFindEventsResult,
      total: events.length,
      data: events,
    };
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(eventsResult);

    const dateStart = new Date(Date.now() - 60 * 1000).toISOString();

    const result = await alertsClient.getAlertStatus({ id: '1', dateStart });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "alertTypeId": "123",
        "consumer": "alert-consumer",
        "enabled": true,
        "errorMessages": Array [],
        "id": "1",
        "instances": Object {
          "instance-currently-active": Object {
            "activeStartDate": "2019-02-12T21:01:22.479Z",
            "muted": false,
            "status": "Active",
          },
          "instance-muted-no-activity": Object {
            "activeStartDate": undefined,
            "muted": true,
            "status": "OK",
          },
          "instance-previously-active": Object {
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

  // Further tests don't check the result of `getAlertStatus()`, as the result
  // is just the result from the `alertStatusFromEventLog()`, which itself
  // has a complete set of tests.  These tests just make sure the data gets
  // sent into `getAlertStatus()` as appropriate.

  test('calls saved objects and event log client with default params', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertStatusSavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(AlertStatusFindEventsResult);

    await alertsClient.getAlertStatus({ id: '1' });

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
    const expectedDuration = 60 * AlertStatusIntervalSeconds * 1000;
    expect(endMillis - startMillis).toBeGreaterThan(expectedDuration - 2);
    expect(endMillis - startMillis).toBeLessThan(expectedDuration + 2);
  });

  test('calls event log client with start date', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertStatusSavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(AlertStatusFindEventsResult);

    const dateStart = new Date(Date.now() - 60 * AlertStatusIntervalSeconds * 1000).toISOString();
    await alertsClient.getAlertStatus({ id: '1', dateStart });

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
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertStatusSavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(AlertStatusFindEventsResult);

    const dateStart = '2m';
    await alertsClient.getAlertStatus({ id: '1', dateStart });

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
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertStatusSavedObject());
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(AlertStatusFindEventsResult);

    const dateStart = 'ain"t no way this will get parsed as a date';
    expect(alertsClient.getAlertStatus({ id: '1', dateStart })).rejects.toMatchInlineSnapshot(
      `[Error: Invalid date for parameter dateStart: "ain"t no way this will get parsed as a date"]`
    );
  });

  test('saved object get throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('OMG!'));
    eventLogClient.findEventsBySavedObject.mockResolvedValueOnce(AlertStatusFindEventsResult);

    expect(alertsClient.getAlertStatus({ id: '1' })).rejects.toMatchInlineSnapshot(`[Error: OMG!]`);
  });

  test('findEvents throws an error', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValueOnce(getAlertStatusSavedObject());
    eventLogClient.findEventsBySavedObject.mockRejectedValueOnce(new Error('OMG 2!'));

    // error eaten but logged
    await alertsClient.getAlertStatus({ id: '1' });
  });
});

describe('find()', () => {
  const listedTypes = new Set([
    {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      id: 'myType',
      name: 'myType',
      producer: 'myApp',
    },
  ]);
  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureAlertTypeIsAuthorized() {},
      logSuccessfulAuthorization() {},
    });
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: 'alert',
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });
    alertTypeRegistry.list.mockReturnValue(listedTypes);
    authorization.filterByAlertTypeAuthorization.mockResolvedValue(
      new Set([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
        },
      ])
    );
  });

  test('calls saved objects client with given params', async () => {
    const alertsClient = new AlertsClient(alertsClientParams);
    const result = await alertsClient.find({ options: {} });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
          Object {
            "actions": Array [
              Object {
                "group": "default",
                "id": "1",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "myType",
            "createdAt": 2019-02-12T21:01:22.479Z,
            "id": "1",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "updatedAt": 2019-02-12T21:01:22.479Z,
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 1,
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "fields": undefined,
          "type": "alert",
        },
      ]
    `);
  });

  describe('authorization', () => {
    test('ensures user is query filter types down to those the user is authorized to find', async () => {
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        filter:
          '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))',
        ensureAlertTypeIsAuthorized() {},
        logSuccessfulAuthorization() {},
      });

      const alertsClient = new AlertsClient(alertsClientParams);
      await alertsClient.find({ options: { filter: 'someTerm' } });

      const [options] = unsecuredSavedObjectsClient.find.mock.calls[0];
      expect(options.filter).toMatchInlineSnapshot(
        `"someTerm and ((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))"`
      );
      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledTimes(1);
    });

    test('throws if user is not authorized to find any types', async () => {
      const alertsClient = new AlertsClient(alertsClientParams);
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('not authorized'));
      await expect(alertsClient.find({ options: {} })).rejects.toThrowErrorMatchingInlineSnapshot(
        `"not authorized"`
      );
    });

    test('ensures authorization even when the fields required to authorize are omitted from the find', async () => {
      const ensureAlertTypeIsAuthorized = jest.fn();
      const logSuccessfulAuthorization = jest.fn();
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        filter: '',
        ensureAlertTypeIsAuthorized,
        logSuccessfulAuthorization,
      });

      unsecuredSavedObjectsClient.find.mockReset();
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: 'alert',
            attributes: {
              actions: [],
              alertTypeId: 'myType',
              consumer: 'myApp',
              tags: ['myTag'],
            },
            score: 1,
            references: [],
          },
        ],
      });

      const alertsClient = new AlertsClient(alertsClientParams);
      expect(await alertsClient.find({ options: { fields: ['tags'] } })).toMatchInlineSnapshot(`
        Object {
          "data": Array [
            Object {
              "actions": Array [],
              "id": "1",
              "schedule": undefined,
              "tags": Array [
                "myTag",
              ],
            },
          ],
          "page": 1,
          "perPage": 10,
          "total": 1,
        }
      `);

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        fields: ['tags', 'alertTypeId', 'consumer'],
        type: 'alert',
      });
      expect(ensureAlertTypeIsAuthorized).toHaveBeenCalledWith('myType', 'myApp');
      expect(logSuccessfulAuthorization).toHaveBeenCalled();
    });
  });
});

describe('delete()', () => {
  let alertsClient: AlertsClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      alertTypeId: 'myType',
      consumer: 'myApp',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      scheduledTaskId: 'task-123',
      actions: [
        {
          group: 'default',
          actionTypeId: '.no-op',
          actionRef: 'action_0',
          params: {
            foo: true,
          },
        },
      ],
    },
    references: [
      {
        name: 'action_0',
        type: 'action',
        id: '1',
      },
    ],
  };
  const existingDecryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    unsecuredSavedObjectsClient.delete.mockResolvedValue({
      success: true,
    });
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedAlert);
  });

  test('successfully removes an alert', async () => {
    const result = await alertsClient.delete({ id: '1' });
    expect(result).toEqual({ success: true });
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith('alert', '1');
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });

  test('falls back to SOC.get when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    const result = await alertsClient.delete({ id: '1' });
    expect(result).toEqual({ success: true });
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledWith('alert', '1');
    expect(taskManager.remove).toHaveBeenCalledWith('task-123');
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'delete(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test(`doesn't remove a task when scheduledTaskId is null`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingDecryptedAlert,
      attributes: {
        ...existingDecryptedAlert.attributes,
        scheduledTaskId: null,
      },
    });

    await alertsClient.delete({ id: '1' });
    expect(taskManager.remove).not.toHaveBeenCalled();
  });

  test(`doesn't invalidate API key when apiKey is null`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        apiKey: null,
      },
    });

    await alertsClient.delete({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test('swallows error when invalidate API key throws', async () => {
    alertsClientParams.invalidateAPIKey.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.delete({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to invalidate API Key: Fail'
    );
  });

  test('swallows error when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await alertsClient.delete({ id: '1' });
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'delete(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test('throws error when unsecuredSavedObjectsClient.get throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
    unsecuredSavedObjectsClient.get.mockRejectedValue(new Error('SOC Fail'));

    await expect(alertsClient.delete({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"SOC Fail"`
    );
  });

  test('throws error when taskManager.remove throws an error', async () => {
    taskManager.remove.mockRejectedValue(new Error('TM Fail'));

    await expect(alertsClient.delete({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"TM Fail"`
    );
  });

  describe('authorization', () => {
    test('ensures user is authorised to delete this type of alert under the consumer', async () => {
      await alertsClient.delete({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'delete');
    });

    test('throws when user is not authorised to delete this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to delete a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.delete({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to delete a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'delete');
    });
  });
});

describe('update()', () => {
  let alertsClient: AlertsClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      enabled: true,
      tags: ['foo'],
      alertTypeId: 'myType',
      schedule: { interval: '10s' },
      consumer: 'myApp',
      scheduledTaskId: 'task-123',
      params: {},
      throttle: null,
      actions: [
        {
          group: 'default',
          id: '1',
          actionTypeId: '1',
          actionRef: '1',
          params: {
            foo: true,
          },
        },
      ],
    },
    references: [],
    version: '123',
  };
  const existingDecryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedAlert);
    alertTypeRegistry.get.mockReturnValue({
      id: 'myType',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      defaultActionGroupId: 'default',
      async executor() {},
      producer: 'alerts',
    });
  });

  test('updates given parameters', async () => {
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    const result = await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: null,
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test2",
            "group": "default",
            "id": "2",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": true,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0]).toHaveLength(4);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionRef": "action_1",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionRef": "action_2",
            "actionTypeId": "test2",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "myType",
        "apiKey": null,
        "apiKeyOwner": null,
        "consumer": "myApp",
        "enabled": true,
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
      Object {
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
          Object {
            "id": "1",
            "name": "action_1",
            "type": "action",
          },
          Object {
            "id": "2",
            "name": "action_2",
            "type": "action",
          },
        ],
        "version": "123",
      }
    `);
  });

  it('calls the createApiKey function', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        apiKey: Buffer.from('123:abc').toString('base64'),
        scheduledTaskId: 'task-123',
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: '5m',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "apiKey": "MTIzOmFiYw==",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": true,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0]).toHaveLength(4);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "myType",
        "apiKey": "MTIzOmFiYw==",
        "apiKeyOwner": "elastic",
        "consumer": "myApp",
        "enabled": true,
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "throttle": "5m",
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
                                                Object {
                                                  "references": Array [
                                                    Object {
                                                      "id": "1",
                                                      "name": "action_0",
                                                      "type": "action",
                                                    },
                                                  ],
                                                  "version": "123",
                                                }
                                `);
  });

  it(`doesn't call the createAPIKey function when alert is disabled`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingDecryptedAlert,
      attributes: {
        ...existingDecryptedAlert.attributes,
        enabled: false,
      },
    });
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        apiKey: null,
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: '5m',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(alertsClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "apiKey": null,
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": false,
        "id": "1",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0]).toHaveLength(4);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][1]).toEqual('1');
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "myType",
        "apiKey": null,
        "apiKeyOwner": null,
        "consumer": "myApp",
        "enabled": false,
        "name": "abc",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "throttle": "5m",
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.update.mock.calls[0][3]).toMatchInlineSnapshot(`
                                                Object {
                                                  "references": Array [
                                                    Object {
                                                      "id": "1",
                                                      "name": "action_0",
                                                      "type": "action",
                                                    },
                                                  ],
                                                  "version": "123",
                                                }
                                `);
  });

  it('should validate params', async () => {
    alertTypeRegistry.get.mockReturnValueOnce({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      defaultActionGroupId: 'default',
      validate: {
        params: schema.object({
          param1: schema.string(),
        }),
      },
      async executor() {},
      producer: 'alerts',
    });
    await expect(
      alertsClient.update({
        id: '1',
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  it('should trim alert name in the API key name', async () => {
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        name: ' my alert name ',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        apiKey: null,
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    await alertsClient.update({
      id: '1',
      data: {
        ...existingAlert.attributes,
        name: ' my alert name ',
      },
    });

    expect(alertsClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/my alert name');
  });

  it('swallows error when invalidate API key throws', async () => {
    alertsClientParams.invalidateAPIKey.mockRejectedValueOnce(new Error('Fail'));
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: null,
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to invalidate API Key: Fail'
    );
  });

  it('swallows error when getDecryptedAsInternalUser throws', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
    unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test',
          },
          references: [],
        },
        {
          id: '2',
          type: 'action',
          attributes: {
            actions: [],
            actionTypeId: 'test2',
          },
          references: [],
        },
      ],
    });
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    await alertsClient.update({
      id: '1',
      data: {
        schedule: { interval: '10s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: '5m',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'update(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  describe('updating an alert schedule', () => {
    function mockApiCalls(
      alertId: string,
      taskId: string,
      currentSchedule: IntervalSchedule,
      updatedSchedule: IntervalSchedule
    ) {
      // mock return values from deps
      alertTypeRegistry.get.mockReturnValueOnce({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        async executor() {},
        producer: 'alerts',
      });
      unsecuredSavedObjectsClient.bulkGet.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: 'action',
            attributes: {
              actions: [],
              actionTypeId: 'test',
            },
            references: [],
          },
        ],
      });
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: alertId,
        type: 'alert',
        attributes: {
          actions: [],
          enabled: true,
          alertTypeId: '123',
          schedule: currentSchedule,
          scheduledTaskId: 'task-123',
        },
        references: [],
        version: '123',
      });

      taskManager.schedule.mockResolvedValueOnce({
        id: taskId,
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Idle,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {},
        params: {},
        ownerId: null,
      });
      unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
        id: alertId,
        type: 'alert',
        attributes: {
          enabled: true,
          schedule: updatedSchedule,
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              actionTypeId: 'test',
              params: {
                foo: true,
              },
            },
          ],
          scheduledTaskId: taskId,
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: alertId,
          },
        ],
      });

      taskManager.runNow.mockReturnValueOnce(Promise.resolve({ id: alertId }));
    }

    test('updating the alert schedule should rerun the task immediately', async () => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();

      mockApiCalls(alertId, taskId, { interval: '60m' }, { interval: '10s' });

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).toHaveBeenCalledWith(taskId);
    });

    test('updating the alert without changing the schedule should not rerun the task', async () => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();

      mockApiCalls(alertId, taskId, { interval: '10s' }, { interval: '10s' });

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).not.toHaveBeenCalled();
    });

    test('updating the alert should not wait for the rerun the task to complete', async (done) => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();

      mockApiCalls(alertId, taskId, { interval: '10s' }, { interval: '30s' });

      const resolveAfterAlertUpdatedCompletes = resolvable<{ id: string }>();
      resolveAfterAlertUpdatedCompletes.then(() => done());

      taskManager.runNow.mockReset();
      taskManager.runNow.mockReturnValue(resolveAfterAlertUpdatedCompletes);

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).toHaveBeenCalled();

      resolveAfterAlertUpdatedCompletes.resolve({ id: alertId });
    });

    test('logs when the rerun of an alerts underlying task fails', async () => {
      const alertId = uuid.v4();
      const taskId = uuid.v4();

      mockApiCalls(alertId, taskId, { interval: '10s' }, { interval: '30s' });

      taskManager.runNow.mockReset();
      taskManager.runNow.mockRejectedValue(new Error('Failed to run alert'));

      await alertsClient.update({
        id: alertId,
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      });

      expect(taskManager.runNow).toHaveBeenCalled();

      expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
        `Alert update failed to run its underlying task. TaskManager runNow failed with Error: Failed to run alert`
      );
    });
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          alertTypeId: 'myType',
          consumer: 'myApp',
          enabled: true,
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          actions: [],
          scheduledTaskId: 'task-123',
          createdAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        references: [],
      });
    });

    test('ensures user is authorised to update this type of alert under the consumer', async () => {
      await alertsClient.update({
        id: '1',
        data: {
          schedule: { interval: '10s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [],
        },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'update');
    });

    test('throws when user is not authorised to update this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to update a "myType" alert for "myApp"`)
      );

      await expect(
        alertsClient.update({
          id: '1',
          data: {
            schedule: { interval: '10s' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            throttle: null,
            actions: [],
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to update a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'update');
    });
  });
});

describe('updateApiKey()', () => {
  let alertsClient: AlertsClient;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      consumer: 'myApp',
      enabled: true,
      actions: [
        {
          group: 'default',
          id: '1',
          actionTypeId: '1',
          actionRef: '1',
          params: {
            foo: true,
          },
        },
      ],
    },
    version: '123',
    references: [],
  };
  const existingEncryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingEncryptedAlert);
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '234', name: '123', api_key: 'abc' },
    });
  });

  test('updates the API key for the alert', async () => {
    await alertsClient.updateApiKey({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        apiKey: Buffer.from('234:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedBy: 'elastic',
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      { version: '123' }
    );
    expect(alertsClientParams.invalidateAPIKey).toHaveBeenCalledWith({ id: '123' });
  });

  test('falls back to SOC when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.updateApiKey({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        apiKey: Buffer.from('234:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        updatedBy: 'elastic',
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: '1',
            actionRef: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
      { version: '123' }
    );
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test('swallows error when invalidate API key throws', async () => {
    alertsClientParams.invalidateAPIKey.mockRejectedValue(new Error('Fail'));

    await alertsClient.updateApiKey({ id: '1' });
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to invalidate API Key: Fail'
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
  });

  test('swallows error when getting decrypted object throws', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    await alertsClient.updateApiKey({ id: '1' });
    expect(alertsClientParams.logger.error).toHaveBeenCalledWith(
      'updateApiKey(): Failed to load API key to invalidate on alert 1: Fail'
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  test('throws when unsecuredSavedObjectsClient update fails', async () => {
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Fail'));

    await expect(alertsClient.updateApiKey({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail"`
    );
    expect(alertsClientParams.invalidateAPIKey).not.toHaveBeenCalled();
  });

  describe('authorization', () => {
    test('ensures user is authorised to updateApiKey this type of alert under the consumer', async () => {
      await alertsClient.updateApiKey({ id: '1' });

      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'updateApiKey'
      );
    });

    test('throws when user is not authorised to updateApiKey this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to updateApiKey a "myType" alert for "myApp"`)
      );

      await expect(alertsClient.updateApiKey({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to updateApiKey a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith(
        'myType',
        'myApp',
        'updateApiKey'
      );
    });
  });
});

describe('listAlertTypes', () => {
  let alertsClient: AlertsClient;
  const alertingAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    id: 'alertingAlertType',
    name: 'alertingAlertType',
    producer: 'alerts',
  };
  const myAppAlertType = {
    actionGroups: [],
    actionVariables: undefined,
    defaultActionGroupId: 'default',
    id: 'myAppAlertType',
    name: 'myAppAlertType',
    producer: 'myApp',
  };
  const setOfAlertTypes = new Set([myAppAlertType, alertingAlertType]);

  const authorizedConsumers = {
    alerts: { read: true, all: true },
    myApp: { read: true, all: true },
    myOtherApp: { read: true, all: true },
  };

  beforeEach(() => {
    alertsClient = new AlertsClient(alertsClientParams);
  });

  test('should return a list of AlertTypes that exist in the registry', async () => {
    alertTypeRegistry.list.mockReturnValue(setOfAlertTypes);
    authorization.filterByAlertTypeAuthorization.mockResolvedValue(
      new Set([
        { ...myAppAlertType, authorizedConsumers },
        { ...alertingAlertType, authorizedConsumers },
      ])
    );
    expect(await alertsClient.listAlertTypes()).toEqual(
      new Set([
        { ...myAppAlertType, authorizedConsumers },
        { ...alertingAlertType, authorizedConsumers },
      ])
    );
  });

  describe('authorization', () => {
    const listedTypes = new Set([
      {
        actionGroups: [],
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        id: 'myType',
        name: 'myType',
        producer: 'myApp',
      },
      {
        id: 'myOtherType',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        producer: 'alerts',
      },
    ]);
    beforeEach(() => {
      alertTypeRegistry.list.mockReturnValue(listedTypes);
    });

    test('should return a list of AlertTypes that exist in the registry only if the user is authorised to get them', async () => {
      const authorizedTypes = new Set([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
        },
      ]);
      authorization.filterByAlertTypeAuthorization.mockResolvedValue(authorizedTypes);

      expect(await alertsClient.listAlertTypes()).toEqual(authorizedTypes);
    });
  });
});

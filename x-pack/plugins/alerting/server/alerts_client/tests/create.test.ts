/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AlertsClient, ConstructorOptions, CreateOptions } from '../alerts_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { alertTypeRegistryMock } from '../../alert_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '../../../../actions/server';
import { TaskStatus } from '../../../../task_manager/server';
import { auditServiceMock } from '../../../../security/server/audit/index.mock';
import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { RecoveredActionGroup } from '../../../common';

jest.mock('../../../../../../src/core/server/saved_objects/service/lib/utils', () => ({
  SavedObjectsUtils: {
    generateId: () => 'mock-saved-object-id',
  },
}));

const taskManager = taskManagerMock.createStart();
const alertTypeRegistry = alertTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditServiceMock.create().asScoped(httpServerMock.createKibanaRequest());

const kibanaVersion = 'v7.10.0';
const alertsClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  alertTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: (authorization as unknown) as AlertingAuthorization,
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
  auditLogger,
};

beforeEach(() => {
  getBeforeSetup(alertsClientParams, taskManager, alertTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

function getMockData(
  overwrites: Record<string, unknown> = {}
): CreateOptions<{
  bar: boolean;
}>['data'] {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    alertTypeId: '123',
    consumer: 'bar',
    schedule: { interval: '10s' },
    throttle: null,
    notifyWhen: null,
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
  let actionsClient: jest.Mocked<ActionsClient>;

  beforeEach(async () => {
    alertsClient = new AlertsClient(alertsClientParams);
    actionsClient = (await alertsClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: '1',
        actionTypeId: 'test',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'email connector',
        isPreconfigured: false,
      },
    ]);
    alertsClientParams.getActionsClient.mockResolvedValue(actionsClient);
  });

  describe('authorization', () => {
    function tryToExecuteOperation(
      options: CreateOptions<{
        bar: boolean;
      }>
    ): Promise<unknown> {
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
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
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

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'create',
        ruleTypeId: 'myType',
      });
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

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'create',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when creating an alert', async () => {
      const data = getMockData({
        enabled: false,
        actions: [],
      });
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: data,
        references: [],
      });
      await alertsClient.create({ data });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'alert_create',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'mock-saved-object-id', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to create an alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        alertsClient.create({
          data: getMockData({
            enabled: false,
            actions: [],
          }),
        })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'alert_create',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: 'mock-saved-object-id',
              type: 'alert',
            },
          },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  test('creates an alert', async () => {
    const data = getMockData();
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      mutedInstanceIds: [],
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
    };
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: createdAttributes,
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        ...createdAttributes,
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
    expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
      entity: 'rule',
      consumer: 'bar',
      operation: 'create',
      ruleTypeId: '123',
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
        "alertTypeId": "123",
        "consumer": "bar",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "createdBy": "elastic",
        "enabled": true,
        "id": "1",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": null,
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
        "updatedAt": 2019-02-12T21:01:22.479Z,
        "updatedBy": "elastic",
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
        "executionStatus": Object {
          "error": null,
          "lastExecutionDate": "2019-02-12T21:01:22.479Z",
          "status": "pending",
        },
        "meta": Object {
          "versionApiKeyLastmodified": "v7.10.0",
        },
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": "onActiveAlert",
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
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "id": "mock-saved-object-id",
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
                                                                            "schedule": Object {
                                                                              "interval": "10s",
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
    expect(actionsClient.isActionTypeEnabled).toHaveBeenCalledWith('test', { notifyUsage: true });
  });

  test('creates an alert with a custom id', async () => {
    const data = getMockData();
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      mutedInstanceIds: [],
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
    };
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '123',
      type: 'alert',
      attributes: createdAttributes,
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
    const result = await alertsClient.create({ data, options: { id: '123' } });
    expect(result.id).toEqual('123');
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "id": "123",
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
        ],
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
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: '1',
        actionTypeId: 'test',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'email connector',
        isPreconfigured: false,
      },
      {
        id: '2',
        actionTypeId: 'test',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'email connector',
        isPreconfigured: false,
      },
    ]);
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
        updatedAt: new Date().toISOString(),
        notifyWhen: 'onActiveAlert',
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
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
        "notifyWhen": "onActiveAlert",
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
        updatedAt: new Date().toISOString(),
        notifyWhen: 'onActiveAlert',
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
        "notifyWhen": "onActiveAlert",
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
        updatedAt: new Date().toISOString(),
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

  test('should create alert with given notifyWhen value if notifyWhen is not null', async () => {
    const data = getMockData({ notifyWhen: 'onActionGroupChange', throttle: '10m' });
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen: 'onActionGroupChange',
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
    };
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: createdAttributes,
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
    const result = await alertsClient.create({ data });
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
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: 'v7.10.0',
        },
        schedule: { interval: '10s' },
        throttle: '10m',
        notifyWhen: 'onActionGroupChange',
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
        },
      },
      {
        id: 'mock-saved-object-id',
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      }
    );
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
        "consumer": "bar",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "createdBy": "elastic",
        "enabled": true,
        "id": "1",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": "onActionGroupChange",
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
        "throttle": "10m",
        "updatedAt": 2019-02-12T21:01:22.479Z,
        "updatedBy": "elastic",
      }
    `);
  });

  test('should create alert with notifyWhen = onThrottleInterval if notifyWhen is null and throttle is set', async () => {
    const data = getMockData({ throttle: '10m' });
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen: 'onThrottleInterval',
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
    };
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: createdAttributes,
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
    const result = await alertsClient.create({ data });
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
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: 'v7.10.0',
        },
        schedule: { interval: '10s' },
        throttle: '10m',
        notifyWhen: 'onThrottleInterval',
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
        },
      },
      {
        id: 'mock-saved-object-id',
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      }
    );
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
        "consumer": "bar",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "createdBy": "elastic",
        "enabled": true,
        "id": "1",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": "onThrottleInterval",
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
        "throttle": "10m",
        "updatedAt": 2019-02-12T21:01:22.479Z,
        "updatedBy": "elastic",
      }
    `);
  });

  test('should create alert with notifyWhen = onActiveAlert if notifyWhen is null and throttle is null', async () => {
    const data = getMockData();
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      mutedInstanceIds: [],
      notifyWhen: 'onActiveAlert',
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
    };
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: createdAttributes,
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
    const result = await alertsClient.create({ data });
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
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: 'v7.10.0',
        },
        schedule: { interval: '10s' },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
        },
      },
      {
        id: 'mock-saved-object-id',
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
      }
    );
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
        "consumer": "bar",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "createdBy": "elastic",
        "enabled": true,
        "id": "1",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": "onActiveAlert",
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
        "updatedAt": 2019-02-12T21:01:22.479Z,
        "updatedBy": "elastic",
      }
    `);
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
      recoveryActionGroup: RecoveredActionGroup,
      validate: {
        params: schema.object({
          param1: schema.string(),
          threshold: schema.number({ min: 0, max: 1 }),
        }),
      },
      minimumLicenseRequired: 'basic',
      async executor() {},
      producer: 'alerts',
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('throws error if loading actions fails', async () => {
    const data = getMockData();
    // Reset from default behaviour
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockRejectedValueOnce(new Error('Test Error'));
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test Error"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error and add API key to invalidatePendingApiKey SO when create saved object fails', async () => {
    const data = getMockData();
    alertsClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Test failure'));
    const createdAt = new Date().toISOString();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt,
      },
      references: [],
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(taskManager.schedule).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(2);
    expect(unsecuredSavedObjectsClient.create.mock.calls[1][1]).toStrictEqual({
      apiKeyId: '123',
      createdAt,
    });
  });

  test('attempts to remove saved object if scheduling failed', async () => {
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
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
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: 'v7.10.0',
        },
        schedule: { interval: '10s' },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
        },
      },
      {
        id: 'mock-saved-object-id',
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
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
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: false,
        meta: {
          versionApiKeyLastmodified: 'v7.10.0',
        },
        schedule: { interval: '10s' },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: false,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
        },
      },
      {
        id: 'mock-saved-object-id',
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

  test('throws an error if API key creation throws', async () => {
    const data = getMockData();
    alertsClientParams.createAPIKey.mockImplementation(() => {
      throw new Error('no');
    });
    expect(
      async () => await alertsClient.create({ data })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error creating rule: could not create API key - no"`
    );
  });

  test('throws error when ensureActionTypeEnabled throws', async () => {
    const data = getMockData();
    alertTypeRegistry.ensureAlertTypeEnabled.mockImplementation(() => {
      throw new Error('Fail');
    });
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail"`
    );
  });

  test('throws error when adding action using connector with missing secrets', async () => {
    const data = getMockData();
    // Reset from default behaviour
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValueOnce([
      {
        id: '1',
        actionTypeId: 'test',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: true,
        name: 'email connector',
        isPreconfigured: false,
      },
    ]);
    await expect(alertsClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid connectors: email connector"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });
});

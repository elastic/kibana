/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RulesClient, ConstructorOptions, CreateOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { RecoveredActionGroup } from '../../../common';
import { getDefaultRuleMonitoring } from '../../task_runner/task_runner';

jest.mock('@kbn/core/server/saved_objects/service/lib/utils', () => ({
  SavedObjectsUtils: {
    generateId: () => 'mock-saved-object-id',
  },
}));

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const kibanaVersion = 'v8.0.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
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
  minimumScheduleInterval: { value: '1m', enforce: false },
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

function getMockData(overwrites: Record<string, unknown> = {}): CreateOptions<{
  bar: boolean;
}>['data'] {
  return {
    enabled: true,
    name: 'abc',
    tags: ['foo'],
    alertTypeId: '123',
    consumer: 'bar',
    schedule: { interval: '1m' },
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
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);
    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
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
    taskManager.schedule.mockResolvedValue({
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
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
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
          schedule: { interval: '1m' },
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

      return rulesClient.create(options);
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
    test('logs audit event when creating a rule', async () => {
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
      await rulesClient.create({ data });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_create',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: 'mock-saved-object-id', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to create a rule', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        rulesClient.create({
          data: getMockData({
            enabled: false,
            actions: [],
          }),
        })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_create',
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
      schedule: { interval: '1m' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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
    const result = await rulesClient.create({ data });
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
          "interval": "1m",
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
          "warning": null,
        },
        "legacyId": null,
        "meta": Object {
          "versionApiKeyLastmodified": "v8.0.0",
        },
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [],
          },
        },
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "snoozeEndTime": null,
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
                                                                            "id": "1",
                                                                            "params": Object {
                                                                              "alertId": "1",
                                                                              "consumer": "bar",
                                                                              "spaceId": "default",
                                                                            },
                                                                            "schedule": Object {
                                                                              "interval": "1m",
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
      schedule: { interval: '1m' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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
    const result = await rulesClient.create({ data, options: { id: '123' } });
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

  test('sets legacyId when kibanaVersion is < 8.0.0', async () => {
    const customrulesClient = new RulesClient({
      ...rulesClientParams,
      kibanaVersion: 'v7.10.0',
    });
    const data = getMockData();
    const createdAttributes = {
      ...data,
      legacyId: '123',
      alertTypeId: '123',
      schedule: { interval: '1m' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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
    const result = await customrulesClient.create({ data, options: { id: '123' } });
    expect(result.id).toEqual('123');
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
          "warning": null,
        },
        "legacyId": "123",
        "meta": Object {
          "versionApiKeyLastmodified": "v7.10.0",
        },
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [],
          },
        },
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "snoozeEndTime": null,
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "elastic",
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
        schedule: { interval: '1m' },
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
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        actions: [],
        scheduledTaskId: 'task-123',
      },
      references: [],
    });
    const result = await rulesClient.create({ data });
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
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
  });

  test('creates a rule with some actions using preconfigured connectors', async () => {
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
          id: 'preconfigured',
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
        actionTypeId: 'test2',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'another email connector',
        isPreconfigured: false,
      },
      {
        id: 'preconfigured',
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
        name: 'preconfigured email connector',
        isPreconfigured: true,
      },
    ]);
    actionsClient.isPreconfigured.mockReset();
    actionsClient.isPreconfigured.mockReturnValueOnce(false);
    actionsClient.isPreconfigured.mockReturnValueOnce(true);
    actionsClient.isPreconfigured.mockReturnValueOnce(false);
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '1m' },
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
            actionRef: 'preconfigured:preconfigured',
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
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
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
    const result = await rulesClient.create({ data });
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
            "id": "preconfigured",
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
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
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
            actionRef: 'preconfigured:preconfigured',
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
        alertTypeId: '123',
        apiKey: null,
        apiKeyOwner: null,
        consumer: 'bar',
        createdAt: '2019-02-12T21:01:22.479Z',
        createdBy: 'elastic',
        enabled: true,
        legacyId: null,
        executionStatus: {
          error: null,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
        meta: { versionApiKeyLastmodified: kibanaVersion },
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        name: 'abc',
        notifyWhen: 'onActiveAlert',
        params: { bar: true },
        schedule: { interval: '1m' },
        tags: ['foo'],
        throttle: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        id: 'mock-saved-object-id',
        references: [
          { id: '1', name: 'action_0', type: 'action' },
          { id: '2', name: 'action_2', type: 'action' },
        ],
      }
    );
    expect(actionsClient.isPreconfigured).toHaveBeenCalledTimes(3);
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
    const result = await rulesClient.create({ data });
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

  test('should call useSavedObjectReferences.extractReferences and useSavedObjectReferences.injectReferences if defined for rule type', async () => {
    const ruleParams = {
      bar: true,
      parameterThatIsSavedObjectId: '9',
    };
    const extractReferencesFn = jest.fn().mockReturnValue({
      params: {
        bar: true,
        parameterThatIsSavedObjectRef: 'soRef_0',
      },
      references: [
        {
          name: 'soRef_0',
          type: 'someSavedObjectType',
          id: '9',
        },
      ],
    });
    const injectReferencesFn = jest.fn().mockReturnValue({
      bar: true,
      parameterThatIsSavedObjectId: '9',
    });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {},
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: extractReferencesFn,
        injectReferences: injectReferencesFn,
      },
      config: {
        run: {
          actions: { max: 1000 },
        },
      },
    }));
    const data = getMockData({
      params: ruleParams,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '1m' },
        params: {
          bar: true,
          parameterThatIsSavedObjectRef: 'soRef_0',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notifyWhen: null,
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
        {
          name: 'param:soRef_0',
          type: 'someSavedObjectType',
          id: '9',
        },
      ],
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
    const result = await rulesClient.create({ data });

    expect(extractReferencesFn).toHaveBeenCalledWith(ruleParams);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        actions: [
          { actionRef: 'action_0', actionTypeId: 'test', group: 'default', params: { foo: true } },
        ],
        alertTypeId: '123',
        apiKey: null,
        apiKeyOwner: null,
        consumer: 'bar',
        createdAt: '2019-02-12T21:01:22.479Z',
        createdBy: 'elastic',
        enabled: true,
        legacyId: null,
        executionStatus: {
          error: null,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
        meta: { versionApiKeyLastmodified: kibanaVersion },
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        name: 'abc',
        notifyWhen: 'onActiveAlert',
        params: { bar: true, parameterThatIsSavedObjectRef: 'soRef_0' },
        schedule: { interval: '1m' },
        tags: ['foo'],
        throttle: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        id: 'mock-saved-object-id',
        references: [
          { id: '1', name: 'action_0', type: 'action' },
          { id: '9', name: 'param:soRef_0', type: 'someSavedObjectType' },
        ],
      }
    );

    expect(injectReferencesFn).toHaveBeenCalledWith(
      {
        bar: true,
        parameterThatIsSavedObjectRef: 'soRef_0',
      },
      [{ id: '9', name: 'soRef_0', type: 'someSavedObjectType' }]
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
        "createdAt": 2019-02-12T21:01:22.479Z,
        "id": "1",
        "notifyWhen": null,
        "params": Object {
          "bar": true,
          "parameterThatIsSavedObjectId": "9",
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
  });

  test('should allow rule types to use action_ prefix for saved object reference names', async () => {
    const ruleParams = {
      bar: true,
      parameterThatIsSavedObjectId: '8',
    };
    const extractReferencesFn = jest.fn().mockReturnValue({
      params: {
        bar: true,
        parameterThatIsSavedObjectRef: 'action_0',
      },
      references: [
        {
          name: 'action_0',
          type: 'someSavedObjectType',
          id: '8',
        },
      ],
    });
    const injectReferencesFn = jest.fn().mockReturnValue({
      bar: true,
      parameterThatIsSavedObjectId: '8',
    });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {},
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: extractReferencesFn,
        injectReferences: injectReferencesFn,
      },
      config: {
        run: {
          actions: { max: 1000 },
        },
      },
    }));
    const data = getMockData({
      params: ruleParams,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '1m' },
        params: {
          bar: true,
          parameterThatIsSavedObjectRef: 'action_0',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notifyWhen: null,
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
        {
          name: 'param:action_0',
          type: 'someSavedObjectType',
          id: '8',
        },
      ],
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
    const result = await rulesClient.create({ data });

    expect(extractReferencesFn).toHaveBeenCalledWith(ruleParams);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        actions: [
          { actionRef: 'action_0', actionTypeId: 'test', group: 'default', params: { foo: true } },
        ],
        alertTypeId: '123',
        apiKey: null,
        apiKeyOwner: null,
        legacyId: null,
        consumer: 'bar',
        createdAt: '2019-02-12T21:01:22.479Z',
        createdBy: 'elastic',
        enabled: true,
        executionStatus: {
          error: null,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
        meta: { versionApiKeyLastmodified: kibanaVersion },
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        name: 'abc',
        notifyWhen: 'onActiveAlert',
        params: { bar: true, parameterThatIsSavedObjectRef: 'action_0' },
        schedule: { interval: '1m' },
        tags: ['foo'],
        throttle: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        id: 'mock-saved-object-id',
        references: [
          { id: '1', name: 'action_0', type: 'action' },
          { id: '8', name: 'param:action_0', type: 'someSavedObjectType' },
        ],
      }
    );

    expect(injectReferencesFn).toHaveBeenCalledWith(
      {
        bar: true,
        parameterThatIsSavedObjectRef: 'action_0',
      },
      [{ id: '8', name: 'action_0', type: 'someSavedObjectType' }]
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
        "createdAt": 2019-02-12T21:01:22.479Z,
        "id": "1",
        "notifyWhen": null,
        "params": Object {
          "bar": true,
          "parameterThatIsSavedObjectId": "8",
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
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

    await rulesClient.create({ data });
    expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: 123/my alert name');
  });

  test('should create alert with given notifyWhen value if notifyWhen is not null', async () => {
    const data = getMockData({ notifyWhen: 'onActionGroupChange', throttle: '10m' });
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '1m' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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
    const result = await rulesClient.create({ data });
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
        legacyId: null,
        params: { bar: true },
        apiKey: null,
        apiKeyOwner: null,
        createdBy: 'elastic',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        schedule: { interval: '1m' },
        throttle: '10m',
        notifyWhen: 'onActionGroupChange',
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
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
          "interval": "1m",
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
      schedule: { interval: '1m' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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
    const result = await rulesClient.create({ data });
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
        legacyId: null,
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
          versionApiKeyLastmodified: kibanaVersion,
        },
        schedule: { interval: '1m' },
        throttle: '10m',
        notifyWhen: 'onThrottleInterval',
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
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
          "interval": "1m",
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
      schedule: { interval: '1m' },
      params: {
        bar: true,
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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
    const result = await rulesClient.create({ data });
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
        legacyId: null,
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
          versionApiKeyLastmodified: kibanaVersion,
        },
        schedule: { interval: '1m' },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
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
          "interval": "1m",
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

  test('should create alerts with mapped_params', async () => {
    const data = getMockData({
      params: {
        bar: true,
        risk_score: 42,
        severity: 'low',
      },
    });

    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '10s' },
      params: {
        bar: true,
        risk_score: 42,
        severity: 'low',
      },
      createdAt: '2019-02-12T21:01:22.479Z',
      createdBy: 'elastic',
      updatedBy: 'elastic',
      updatedAt: '2019-02-12T21:01:22.479Z',
      muteAll: false,
      snoozeEndTime: null,
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

    const result = await rulesClient.create({ data });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        enabled: true,
        name: 'abc',
        tags: ['foo'],
        alertTypeId: '123',
        consumer: 'bar',
        schedule: {
          interval: '1m',
        },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        params: {
          bar: true,
          risk_score: 42,
          severity: 'low',
        },
        actions: [
          {
            group: 'default',
            params: {
              foo: true,
            },
            actionRef: 'action_0',
            actionTypeId: 'test',
          },
        ],
        apiKeyOwner: null,
        apiKey: null,
        legacyId: null,
        createdBy: 'elastic',
        updatedBy: 'elastic',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedAt: '2019-02-12T21:01:22.479Z',
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        executionStatus: {
          status: 'pending',
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          error: null,
          warning: null,
        },
        monitoring: {
          execution: {
            history: [],
            calculated_metrics: {
              success_ratio: 0,
            },
          },
        },
        mapped_params: {
          risk_score: 42,
          severity: '20-low',
        },
        meta: {
          versionApiKeyLastmodified: 'v8.0.0',
        },
      },
      {
        references: [
          {
            id: '1',
            name: 'action_0',
            type: 'action',
          },
        ],
        id: 'mock-saved-object-id',
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
        "id": "123",
        "muteAll": false,
        "mutedInstanceIds": Array [],
        "name": "abc",
        "notifyWhen": null,
        "params": Object {
          "bar": true,
          "risk_score": 42,
          "severity": "low",
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
    ruleTypeRegistry.get.mockReturnValue({
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
      isExportable: true,
      async executor() {},
      producer: 'alerts',
      config: {
        run: {
          actions: { max: 1000 },
        },
      },
    });
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  test('throws error if loading actions fails', async () => {
    const data = getMockData();
    // Reset from default behaviour
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockRejectedValueOnce(new Error('Test Error'));
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test Error"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error and add API key to invalidatePendingApiKey SO when create saved object fails', async () => {
    const data = getMockData();
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
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
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Test failure"`
    );
    expect(taskManager.schedule).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(2);
    expect(unsecuredSavedObjectsClient.create.mock.calls[1][1]).toStrictEqual({
      apiKeyId: '123',
      createdAt,
    });
  });

  test('fails if task scheduling fails due to conflict', async () => {
    const data = getMockData();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '1m' },
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
    taskManager.schedule.mockRejectedValueOnce(
      Object.assign(new Error('Conflict!'), { statusCode: 409 })
    );
    unsecuredSavedObjectsClient.delete.mockResolvedValueOnce({});
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Conflict!"`
    );
    expect(unsecuredSavedObjectsClient.delete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
                                                                                                                  Array [
                                                                                                                    "alert",
                                                                                                                    "1",
                                                                                                                  ]
                                                                            `);
  });

  test('attempts to remove saved object if scheduling failed', async () => {
    const data = getMockData();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '1m' },
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
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
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
        schedule: { interval: '1m' },
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
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Task manager error"`
    );
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to cleanup alert "1" after scheduling task failed. Error: Saved object delete error'
    );
  });

  test('throws an error if alert type not registerd', async () => {
    const data = getMockData();
    ruleTypeRegistry.get.mockImplementation(() => {
      throw new Error('Invalid type');
    });
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid type"`
    );
  });

  test('calls the API key function', async () => {
    const data = getMockData();
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '1m' },
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
    await rulesClient.create({ data });

    expect(rulesClientParams.createAPIKey).toHaveBeenCalledTimes(1);
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
        legacyId: null,
        params: { bar: true },
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        createdBy: 'elastic',
        createdAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        updatedAt: '2019-02-12T21:01:22.479Z',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        schedule: { interval: '1m' },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
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
        schedule: { interval: '1m' },
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
    await rulesClient.create({ data });

    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
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
        legacyId: null,
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
          versionApiKeyLastmodified: kibanaVersion,
        },
        schedule: { interval: '1m' },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        muteAll: false,
        snoozeEndTime: null,
        mutedInstanceIds: [],
        tags: ['foo'],
        executionStatus: {
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          status: 'pending',
          error: null,
          warning: null,
        },
        monitoring: getDefaultRuleMonitoring(),
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
    rulesClientParams.createAPIKey.mockImplementation(() => {
      throw new Error('no');
    });
    expect(
      async () => await rulesClient.create({ data })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error creating rule: could not create API key - no"`
    );
  });

  test('throws error when ensureActionTypeEnabled throws', async () => {
    const data = getMockData();
    ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
      throw new Error('Fail');
    });
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
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
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Invalid connectors: email connector"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('logs warning when creating with an interval less than the minimum configured one when enforce = false', async () => {
    const data = getMockData({ schedule: { interval: '1s' } });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {},
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: jest.fn(),
        injectReferences: jest.fn(),
      },
    }));
    const createdAttributes = {
      ...data,
      alertTypeId: '123',
      schedule: { interval: '1s' },
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

    await rulesClient.create({ data });
    expect(rulesClientParams.logger.warn).toHaveBeenCalledWith(
      `Rule schedule interval (1s) for "123" rule type with ID "1" is less than the minimum value (1m). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent creation of these rules.`
    );
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalled();
    expect(taskManager.schedule).toHaveBeenCalled();
  });

  test('throws error when creating with an interval less than the minimum configured one when enforce = true', async () => {
    rulesClient = new RulesClient({
      ...rulesClientParams,
      minimumScheduleInterval: { value: '1m', enforce: true },
    });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {},
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: jest.fn(),
        injectReferences: jest.fn(),
      },
      config: {
        run: {
          actions: { max: 1000 },
        },
      },
    }));

    const data = getMockData({ schedule: { interval: '1s' } });
    await expect(rulesClient.create({ data })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error creating rule: the interval is less than the allowed minimum interval of 1m"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });
});

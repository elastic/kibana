/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '../../../../actions/server';
import { InvalidatePendingApiKey } from '../../types';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { eventLoggerMock } from '../../../../event_log/server/event_logger.mock';
import { TaskStatus } from '../../../../task_manager/server';

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
}));

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const eventLogger = eventLoggerMock.create();

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
  auditLogger,
  eventLogger,
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  taskManager.get.mockResolvedValue({
    id: 'task-123',
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
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('disable()', () => {
  let rulesClient: RulesClient;
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
    version: '123',
    references: [],
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedAlert);
  });

  describe('authorization', () => {
    test('ensures user is authorised to disable this type of alert under the consumer', async () => {
      await rulesClient.disable({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'disable',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to disable this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to disable a "myType" alert for "myApp"`)
      );

      await expect(rulesClient.disable({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to disable a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'disable',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when disabling a rule', async () => {
      await rulesClient.disable({ id: '1' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_disable',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to disable a rule', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.disable({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_disable',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
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

  test('disables an alert', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    await rulesClient.disable({ id: '1' });
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
        enabled: false,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        scheduledTaskId: null,
        apiKey: null,
        apiKeyOwner: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
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
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-123');
    expect(
      (unsecuredSavedObjectsClient.create.mock.calls[0][1] as InvalidatePendingApiKey).apiKeyId
    ).toBe('123');
  });

  test('disables the rule with calling event log to "recover" the alert instances from the task state', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    const scheduledTaskId = 'task-123';
    taskManager.get.mockResolvedValue({
      id: scheduledTaskId,
      taskType: 'alerting:123',
      scheduledAt: new Date(),
      attempts: 1,
      status: TaskStatus.Idle,
      runAt: new Date(),
      startedAt: null,
      retryAt: null,
      state: {
        alertInstances: {
          '1': {
            meta: {
              lastScheduledActions: {
                group: 'default',
                subgroup: 'newSubgroup',
                date: new Date().toISOString(),
              },
            },
            state: { bar: false },
          },
        },
      },
      params: {
        alertId: '1',
      },
      ownerId: null,
    });
    await rulesClient.disable({ id: '1' });
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
        enabled: false,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        scheduledTaskId: null,
        apiKey: null,
        apiKeyOwner: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
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
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-123');
    expect(
      (unsecuredSavedObjectsClient.create.mock.calls[0][1] as InvalidatePendingApiKey).apiKeyId
    ).toBe('123');

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls[0][0]).toStrictEqual({
      event: {
        action: 'recovered-instance',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'myApp',
            rule_type_id: '123',
          },
        },
        alerting: {
          action_group_id: 'default',
          action_subgroup: 'newSubgroup',
          instance_id: '1',
        },
        saved_objects: [
          {
            id: '1',
            namespace: 'default',
            rel: 'primary',
            type: 'alert',
            type_id: 'myType',
          },
        ],
        space_ids: ['default'],
      },
      message: "instance '1' has recovered due to the rule was disabled",
      rule: {
        category: '123',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
  });

  test('disables the rule even if unable to retrieve task manager doc to generate recovery event log events', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    taskManager.get.mockRejectedValueOnce(new Error('Fail'));
    await rulesClient.disable({ id: '1' });
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
        enabled: false,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        scheduledTaskId: null,
        apiKey: null,
        apiKeyOwner: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
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
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-123');
    expect(
      (unsecuredSavedObjectsClient.create.mock.calls[0][1] as InvalidatePendingApiKey).apiKeyId
    ).toBe('123');

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(0);
    expect(rulesClientParams.logger.warn).toHaveBeenCalledWith(
      `rulesClient.disable('1') - Could not write recovery events - Fail`
    );
  });

  test('falls back when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });

    await rulesClient.disable({ id: '1' });
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
        enabled: false,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        scheduledTaskId: null,
        apiKey: null,
        apiKeyOwner: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
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
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-123');
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
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

    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });

    await rulesClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  test(`doesn't invalidate when no API key is used`, async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce(existingAlert);

    await rulesClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
  });

  test('swallows error when failing to load decrypted saved object', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt: '2019-02-12T21:01:22.479Z',
      },
      references: [],
    });
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    await rulesClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(taskManager.removeIfExists).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'disable(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test('throws when unsecuredSavedObjectsClient update fails', async () => {
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Failed to update'));

    await expect(rulesClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update"`
    );
  });

  test('swallows error when invalidate API key throws', async () => {
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('Fail'));
    await rulesClient.disable({ id: '1' });
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'Failed to mark for API key [id="MTIzOmFiYw=="] for invalidation: Fail'
    );
  });

  test('throws when failing to remove task from task manager', async () => {
    taskManager.removeIfExists.mockRejectedValueOnce(new Error('Failed to remove task'));

    await expect(rulesClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to remove task"`
    );
  });
});

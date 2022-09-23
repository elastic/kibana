/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { TaskStatus } from '@kbn/task-manager-plugin/server';

jest.mock('../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

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
    id: '1',
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
  const existingRule = {
    id: '1',
    type: 'alert',
    attributes: {
      consumer: 'myApp',
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      enabled: true,
      scheduledTaskId: '1',
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
  const existingDecryptedRule = {
    ...existingRule,
    attributes: {
      ...existingRule.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
      apiKeyOwner: 'elastic',
    },
    version: '123',
    references: [],
  };

  beforeEach(() => {
    rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingRule);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedRule);
  });

  describe('authorization', () => {
    test('ensures user is authorised to disable this type of rule under the consumer', async () => {
      await rulesClient.disable({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'disable',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to disable this type of rule', async () => {
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

  test('disables an rule', async () => {
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
          versionApiKeyLastmodified: 'v7.10.0',
        },
        scheduledTaskId: '1',
        apiKey: 'MTIzOmFiYw==',
        apiKeyOwner: 'elastic',
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
    expect(taskManager.bulkDisable).toHaveBeenCalledWith(['1']);
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();
  });

  test('disables the rule with calling event log to "recover" the alert instances from the task state', async () => {
    const scheduledTaskId = '1';
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
          versionApiKeyLastmodified: 'v7.10.0',
        },
        scheduledTaskId: '1',
        apiKey: 'MTIzOmFiYw==',
        apiKeyOwner: 'elastic',
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
    expect(taskManager.bulkDisable).toHaveBeenCalledWith(['1']);
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();

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
          versionApiKeyLastmodified: 'v7.10.0',
        },
        scheduledTaskId: '1',
        apiKey: 'MTIzOmFiYw==',
        apiKeyOwner: 'elastic',
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
    expect(taskManager.bulkDisable).toHaveBeenCalledWith(['1']);
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();

    expect(eventLogger.logEvent).toHaveBeenCalledTimes(0);
    expect(rulesClientParams.logger.warn).toHaveBeenCalledWith(
      `rulesClient.disable('1') - Could not write recovery events - Fail`
    );
  });

  test('falls back when getDecryptedAsInternalUser throws an error', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
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
        scheduledTaskId: '1',
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
    expect(taskManager.bulkDisable).toHaveBeenCalledWith(['1']);
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();
  });

  test(`doesn't disable already disabled rules`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingDecryptedRule,
      attributes: {
        ...existingDecryptedRule.attributes,
        actions: [],
        enabled: false,
      },
    });

    await rulesClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();
  });

  test('swallows error when failing to load decrypted saved object', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValueOnce(new Error('Fail'));

    await rulesClient.disable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(taskManager.bulkDisable).toHaveBeenCalled();
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'disable(): Failed to load API key of alert 1: Fail'
    );
  });

  test('throws when unsecuredSavedObjectsClient update fails', async () => {
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Failed to update'));

    await expect(rulesClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to update"`
    );
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();
  });

  test('throws when failing to disable task', async () => {
    taskManager.bulkDisable.mockRejectedValueOnce(new Error('Failed to disable task'));

    await expect(rulesClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to disable task"`
    );
    expect(taskManager.removeIfExists).not.toHaveBeenCalledWith();
  });

  test('removes task document if scheduled task id does not match rule id', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingRule,
      attributes: {
        ...existingRule.attributes,
        scheduledTaskId: 'task-123',
      },
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
        scheduledTaskId: null,
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
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-123');
  });

  test('throws when failing to remove existing task', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingRule,
      attributes: {
        ...existingRule.attributes,
        scheduledTaskId: 'task-123',
      },
    });
    taskManager.removeIfExists.mockRejectedValueOnce(new Error('Failed to remove task'));
    await expect(rulesClient.disable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to remove task"`
    );
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
        scheduledTaskId: null,
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
    expect(taskManager.bulkDisable).not.toHaveBeenCalled();
  });
});

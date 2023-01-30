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
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';

jest.mock('../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

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
};

setGlobalDate();

describe('enable()', () => {
  let rulesClient: RulesClient;

  const existingRule = {
    id: '1',
    type: 'alert',
    attributes: {
      name: 'name',
      consumer: 'myApp',
      schedule: { interval: '10s' },
      alertTypeId: 'myType',
      scheduledTaskId: 'task-123',
      enabled: false,
      apiKey: 'MTIzOmFiYw==',
      apiKeyOwner: 'elastic',
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

  const existingRuleWithoutApiKey = {
    ...existingRule,
    attributes: {
      ...existingRule.attributes,
      apiKey: null,
      apiKeyOwner: null,
    },
  };

  const mockTask = {
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
    enabled: false,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    (auditLogger.log as jest.Mock).mockClear();
    rulesClient = new RulesClient(rulesClientParams);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingRule);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingRule);
    rulesClientParams.createAPIKey.mockResolvedValue({
      apiKeysEnabled: false,
    });
    taskManager.get.mockResolvedValue(mockTask);
  });

  describe('authorization', () => {
    test('ensures user is authorised to enable this type of alert under the consumer', async () => {
      await rulesClient.enable({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'enable',
        ruleTypeId: 'myType',
      });
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith('execute');
    });

    test('throws when user is not authorised to enable this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to enable a "myType" alert for "myApp"`)
      );

      await expect(rulesClient.enable({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to enable a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'enable',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when enabling a rule', async () => {
      await rulesClient.enable({ id: '1' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_enable',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to enable a rule', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.enable({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_enable',
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

  test('enables a rule', async () => {
    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.create).not.toBeCalledWith('api_key_pending_invalidation');
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        name: 'name',
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        apiKey: 'MTIzOmFiYw==',
        apiKeyOwner: 'elastic',
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
        executionStatus: {
          status: 'pending',
          lastDuration: 0,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          error: null,
          warning: null,
        },
        nextRun: '2019-02-12T21:01:32.479Z',
      },
      {
        version: '123',
      }
    );
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('enables a rule that does not have an apiKey', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingRuleWithoutApiKey);
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.create).not.toBeCalledWith('api_key_pending_invalidation');
    expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/name');
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        name: 'name',
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
        apiKey: 'MTIzOmFiYw==',
        apiKeyOwner: 'elastic',
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
        executionStatus: {
          status: 'pending',
          lastDuration: 0,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          error: null,
          warning: null,
        },
        nextRun: '2019-02-12T21:01:32.479Z',
      },
      {
        version: '123',
      }
    );
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test(`doesn't update already enabled alerts but ensures task is enabled`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingRuleWithoutApiKey,
      attributes: {
        ...existingRuleWithoutApiKey.attributes,
        enabled: true,
      },
    });

    await rulesClient.enable({ id: '1' });
    expect(rulesClientParams.getUserName).not.toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('sets API key when createAPIKey returns one', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });

    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        name: 'name',
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
        scheduledTaskId: 'task-123',
        updatedBy: 'elastic',
        updatedAt: '2019-02-12T21:01:22.479Z',
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
        executionStatus: {
          status: 'pending',
          lastDuration: 0,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          error: null,
          warning: null,
        },
        nextRun: '2019-02-12T21:01:32.479Z',
      },
      {
        version: '123',
      }
    );
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('throws an error if API key creation throws', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingRuleWithoutApiKey);

    rulesClientParams.createAPIKey.mockImplementation(() => {
      throw new Error('no');
    });
    await expect(
      async () => await rulesClient.enable({ id: '1' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Error creating API key for rule: no"`);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
  });

  test('falls back when failing to getDecryptedAsInternalUser', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'enable(): Failed to load API key of alert 1: Fail'
    );
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('throws error when failing to load the saved object using SOC', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('Fail to get'));

    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to get"`
    );
    expect(rulesClientParams.getUserName).not.toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).not.toHaveBeenCalled();
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
  });

  test('throws when unsecuredSavedObjectsClient update fails', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.update.mockReset();
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Fail to update'));

    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
  });

  test('enables task when scheduledTaskId is defined and task exists', async () => {
    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('throws error when enabling task fails', async () => {
    taskManager.bulkEnable.mockRejectedValueOnce(new Error('Failed to enable task'));
    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to enable task"`
    );
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
  });

  test('schedules task when scheduledTaskId is defined but task with that ID does not', async () => {
    taskManager.schedule.mockResolvedValueOnce({
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
    taskManager.get.mockRejectedValueOnce(new Error('Failed to get task!'));
    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(taskManager.schedule).toHaveBeenCalledWith({
      id: '1',
      taskType: `alerting:myType`,
      params: {
        alertId: '1',
        spaceId: 'default',
        consumer: 'myApp',
      },
      schedule: {
        interval: '10s',
      },
      enabled: true,
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(2, 'alert', '1', {
      scheduledTaskId: '1',
    });
  });

  test('schedules task when scheduledTaskId is not defined', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingRule,
      attributes: { ...existingRule.attributes, scheduledTaskId: null },
    });
    taskManager.schedule.mockResolvedValueOnce({
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
    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(taskManager.schedule).toHaveBeenCalledWith({
      id: '1',
      taskType: `alerting:myType`,
      params: {
        alertId: '1',
        spaceId: 'default',
        consumer: 'myApp',
      },
      schedule: {
        interval: '10s',
      },
      enabled: true,
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(2, 'alert', '1', {
      scheduledTaskId: '1',
    });
  });

  test('throws error when scheduling task fails', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingRule,
      attributes: { ...existingRule.attributes, scheduledTaskId: null },
    });
    taskManager.schedule.mockRejectedValueOnce(new Error('Fail to schedule'));
    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to schedule"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(taskManager.schedule).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
  });

  test('succeeds if conflict errors received when scheduling a task', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingRule,
      attributes: { ...existingRule.attributes, scheduledTaskId: null },
    });
    taskManager.schedule.mockRejectedValueOnce(
      Object.assign(new Error('Conflict!'), { statusCode: 409 })
    );
    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(taskManager.schedule).toHaveBeenCalled();
  });

  test('throws error when update after scheduling task fails', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingRule,
      attributes: { ...existingRule.attributes, scheduledTaskId: null },
    });
    taskManager.schedule.mockResolvedValueOnce({
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
    unsecuredSavedObjectsClient.update.mockResolvedValueOnce({
      ...existingRule,
      attributes: {
        ...existingRule.attributes,
        enabled: true,
      },
    });
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(
      new Error('Fail to update after scheduling task')
    );

    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update after scheduling task"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.schedule).toHaveBeenCalled();
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(2, 'alert', '1', {
      scheduledTaskId: '1',
    });
  });
});

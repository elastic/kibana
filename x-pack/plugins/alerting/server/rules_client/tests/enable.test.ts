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
import { TaskStatus } from '../../../../task_manager/server';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { InvalidatePendingApiKey } from '../../types';
import { getBeforeSetup, setGlobalDate } from './lib';

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
  minimumScheduleInterval: '1m',
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
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('enable()', () => {
  let rulesClient: RulesClient;
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
    rulesClient = new RulesClient(rulesClientParams);
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingAlert);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
    rulesClientParams.createAPIKey.mockResolvedValue({
      apiKeysEnabled: false,
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        enabled: true,
        apiKey: null,
        apiKeyOwner: null,
        updatedBy: 'elastic',
      },
    });
    taskManager.schedule.mockResolvedValue({
      id: '1',
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
    const createdAt = new Date().toISOString();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        enabled: true,
        apiKey: null,
        apiKeyOwner: null,
        updatedBy: 'elastic',
      },
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt,
      },
      references: [],
    });

    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.create).not.toBeCalledWith('api_key_pending_invalidation');
    expect(rulesClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        updatedAt: '2019-02-12T21:01:22.479Z',
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
        executionStatus: {
          status: 'pending',
          lastDuration: 0,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          error: null,
          warning: null,
        },
      },
      {
        version: '123',
      }
    );
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
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      scheduledTaskId: '1',
    });
  });

  test('invalidates API key if ever one existed prior to updating', async () => {
    const createdAt = new Date().toISOString();
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt,
      },
      references: [],
    });

    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(
      (unsecuredSavedObjectsClient.create.mock.calls[0][1] as InvalidatePendingApiKey).apiKeyId
    ).toBe('123');
  });

  test(`doesn't enable already enabled alerts`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        enabled: true,
      },
    });

    await rulesClient.enable({ id: '1' });
    expect(rulesClientParams.getUserName).not.toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
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
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        apiKey: Buffer.from('123:abc').toString('base64'),
        apiKeyOwner: 'elastic',
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
      },
      {
        version: '123',
      }
    );
  });

  test('throws an error if API key creation throws', async () => {
    rulesClientParams.createAPIKey.mockImplementation(() => {
      throw new Error('no');
    });
    expect(
      async () => await rulesClient.enable({ id: '1' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error enabling rule: could not create API key - no"`
    );
  });

  test('falls back when failing to getDecryptedAsInternalUser', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'enable(): Failed to load API key to invalidate on alert 1: Fail'
    );
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
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error when failing to update the first time', async () => {
    const createdAt = new Date().toISOString();
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.update.mockReset();
    unsecuredSavedObjectsClient.update.mockRejectedValueOnce(new Error('Fail to update'));
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt,
      },
      references: [],
    });

    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).toHaveBeenCalled();
    expect(
      (unsecuredSavedObjectsClient.create.mock.calls[0][1] as InvalidatePendingApiKey).apiKeyId
    ).toBe('123');
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('throws error when failing to update the second time', async () => {
    unsecuredSavedObjectsClient.update.mockReset();
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

    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update second time"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.schedule).toHaveBeenCalled();
  });

  test('throws error when failing to schedule task', async () => {
    taskManager.schedule.mockRejectedValueOnce(new Error('Fail to schedule'));

    await expect(rulesClient.enable({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to schedule"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(rulesClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
  });

  test('enables a rule if conflict errors received when scheduling a task', async () => {
    const createdAt = new Date().toISOString();
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      ...existingAlert,
      attributes: {
        ...existingAlert.attributes,
        enabled: true,
        apiKey: null,
        apiKeyOwner: null,
        updatedBy: 'elastic',
      },
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'api_key_pending_invalidation',
      attributes: {
        apiKeyId: '123',
        createdAt,
      },
      references: [],
    });
    taskManager.schedule.mockRejectedValueOnce(
      Object.assign(new Error('Conflict!'), { statusCode: 409 })
    );

    await rulesClient.enable({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.create).not.toBeCalledWith('api_key_pending_invalidation');
    expect(rulesClientParams.createAPIKey).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        schedule: { interval: '10s' },
        alertTypeId: 'myType',
        consumer: 'myApp',
        enabled: true,
        meta: {
          versionApiKeyLastmodified: kibanaVersion,
        },
        updatedAt: '2019-02-12T21:01:22.479Z',
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
        executionStatus: {
          status: 'pending',
          lastDuration: 0,
          lastExecutionDate: '2019-02-12T21:01:22.479Z',
          error: null,
          warning: null,
        },
      },
      {
        version: '123',
      }
    );
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
      state: {
        alertInstances: {},
        alertTypeState: {},
        previousStartedAt: null,
      },
      scope: ['alerting'],
    });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith('alert', '1', {
      scheduledTaskId: '1',
    });
  });
});

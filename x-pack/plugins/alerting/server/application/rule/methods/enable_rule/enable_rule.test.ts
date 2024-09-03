/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';

import { RulesClient, ConstructorOptions } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { migrateLegacyActions } from '../../../../rules_client/lib';
import { migrateLegacyActionsMock } from '../../../../rules_client/lib/siem_legacy_actions/retrieve_migrated_legacy_actions.mock';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import {
  API_KEY_PENDING_INVALIDATION_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';

jest.mock('../../../../rules_client/lib/siem_legacy_actions/migrate_legacy_actions', () => {
  return {
    migrateLegacyActions: jest.fn(),
  };
});

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../get_schedule_frequency', () => ({
  validateScheduleLimit: jest.fn(),
}));

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  getUserName: jest.fn(),
  createAPIKey: jest.fn(),
  logger: loggingSystemMock.create().get(),
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

setGlobalDate();

describe('enable()', () => {
  let rulesClient: RulesClient;

  const existingRule = {
    id: '1',
    type: RULE_SAVED_OBJECT_TYPE,
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
    (migrateLegacyActions as jest.Mock).mockResolvedValue({
      hasLegacyActions: false,
      resultedActions: [],
      resultedReferences: [],
    });
  });

  describe('authorization', () => {
    test('ensures user is authorised to enable this type of alert under the consumer', async () => {
      await rulesClient.enableRule({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'enable',
        ruleTypeId: 'myType',
      });
      expect(actionsAuthorization.ensureAuthorized).toHaveBeenCalledWith({ operation: 'execute' });
    });

    test('throws when user is not authorised to enable this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to enable a "myType" alert for "myApp"`)
      );

      await expect(rulesClient.enableRule({ id: '1' })).rejects.toMatchInlineSnapshot(
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
      await rulesClient.enableRule({ id: '1' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_enable',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE } },
        })
      );
    });

    test('logs audit event when not authorised to enable a rule', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.enableRule({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_enable',
            outcome: 'failure',
          }),
          kibana: {
            saved_object: {
              id: '1',
              type: RULE_SAVED_OBJECT_TYPE,
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
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
    expect(unsecuredSavedObjectsClient.create).not.toBeCalledWith(
      API_KEY_PENDING_INVALIDATION_TYPE
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
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
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
    expect(unsecuredSavedObjectsClient.create).not.toBeCalledWith(
      API_KEY_PENDING_INVALIDATION_TYPE
    );
    expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/name');
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
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

    await rulesClient.enableRule({ id: '1' });
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

    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
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
      async () => await rulesClient.enableRule({ id: '1' })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Error creating API key for rule - no"`);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
  });

  test('throws an error if API params do not match the schema', async () => {
    await expect(
      // @ts-ignore: this is what we are testing
      async () => await rulesClient.enableRule({ id: 1 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error validating enable rule parameters - [id]: expected value of type [string] but got [number]"`
    );
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
  });

  test('falls back when failing to getDecryptedAsInternalUser', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));

    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(RULE_SAVED_OBJECT_TYPE, '1');
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'enable(): Failed to load API key of alert 1: Fail'
    );
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('throws error when failing to load the saved object using SOC', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(new Error('Fail to get'));

    await expect(rulesClient.enableRule({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
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

    await expect(rulesClient.enableRule({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
  });

  test('enables task when scheduledTaskId is defined and task exists', async () => {
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalled();
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['task-123']);
  });

  test('throws error when enabling task fails', async () => {
    taskManager.bulkEnable.mockRejectedValueOnce(new Error('Failed to enable task'));
    await expect(rulesClient.enableRule({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Failed to enable task"`
    );
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
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
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
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
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(
      2,
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        scheduledTaskId: '1',
      }
    );
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
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
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
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(
      2,
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        scheduledTaskId: '1',
      }
    );
  });

  test('schedules task when task with scheduledTaskId exists but is unrecognized', async () => {
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
    taskManager.get.mockResolvedValue({ ...mockTask, status: TaskStatus.Unrecognized });
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(taskManager.removeIfExists).toHaveBeenCalledWith('task-123');
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
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(
      2,
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        scheduledTaskId: '1',
      }
    );
  });

  test('throws error when scheduling task fails', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...existingRule,
      attributes: { ...existingRule.attributes, scheduledTaskId: null },
    });
    taskManager.schedule.mockRejectedValueOnce(new Error('Fail to schedule'));
    await expect(rulesClient.enableRule({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
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
    await rulesClient.enableRule({ id: '1' });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        namespace: 'default',
      }
    );
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

    await expect(rulesClient.enableRule({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Fail to update after scheduling task"`
    );
    expect(rulesClientParams.getUserName).toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledTimes(2);
    expect(taskManager.schedule).toHaveBeenCalled();
    expect(taskManager.bulkEnable).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.update).toHaveBeenNthCalledWith(
      2,
      RULE_SAVED_OBJECT_TYPE,
      '1',
      {
        scheduledTaskId: '1',
      }
    );
  });

  describe('legacy actions migration for SIEM', () => {
    test('should call migrateLegacyActions', async () => {
      (migrateLegacyActions as jest.Mock).mockResolvedValueOnce({
        hasLegacyActions: true,
        resultedActions: ['fake-action-1'],
        resultedReferences: ['fake-ref-1'],
      });

      const existingDecryptedSiemRule = {
        ...existingRule,
        attributes: { ...existingRule.attributes, consumer: AlertConsumers.SIEM },
      };

      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedSiemRule);
      (migrateLegacyActions as jest.Mock).mockResolvedValue(migrateLegacyActionsMock);

      await rulesClient.enableRule({ id: '1' });

      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: expect.objectContaining({ consumer: AlertConsumers.SIEM }),
        actions: [
          {
            actionRef: '1',
            actionTypeId: '1',
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
        references: [],
        ruleId: '1',
      });
      // to mitigate AAD issues, we call create with overwrite=true and actions related props
      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        RULE_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          ...existingDecryptedSiemRule.attributes,
          actions: ['fake-action-1'],
          throttle: undefined,
          notifyWhen: undefined,
          enabled: true,
        }),
        {
          id: existingDecryptedSiemRule.id,
          overwrite: true,
          references: ['fake-ref-1'],
          version: existingDecryptedSiemRule.version,
        }
      );
    });
  });
});

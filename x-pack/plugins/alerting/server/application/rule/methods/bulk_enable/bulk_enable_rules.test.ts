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
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { loggerMock } from '@kbn/logging-mocks';
import { BulkUpdateTaskResult } from '@kbn/task-manager-plugin/server/task_scheduling';
import { ActionsClient } from '@kbn/actions-plugin/server';
import {
  disabledRule1,
  disabledRule2,
  disabledRuleWithAction1,
  disabledRuleWithAction2,
  savedObjectWith409Error,
  savedObjectWith500Error,
  enabledRuleForBulkOpsWithActions1,
  enabledRuleForBulkOpsWithActions2,
  returnedRuleForBulkEnableWithActions1,
  returnedRuleForBulkEnableWithActions2,
  enabledRuleForBulkOps1,
  enabledRuleForBulkOps2,
  returnedRuleForBulkOps1,
  returnedRuleForBulkOps2,
  disabledRuleForBulkDisable1,
  siemRuleForBulkOps1,
  siemRuleForBulkOps2,
} from '../../../../rules_client/tests/test_helpers';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { migrateLegacyActions } from '../../../../rules_client/lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
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
const logger = loggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const kibanaVersion = 'v8.2.0';
const createAPIKeyMock = jest.fn();
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  authorization: authorization as unknown as AlertingAuthorization,
  actionsAuthorization: actionsAuthorization as unknown as ActionsAuthorization,
  spaceId: 'default',
  namespace: 'default',
  getUserName: jest.fn(),
  createAPIKey: createAPIKeyMock,
  logger,
  internalSavedObjectsRepository,
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  isSystemAction: jest.fn(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  taskManager.bulkEnable.mockImplementation(
    async () =>
      ({
        tasks: [],
        errors: [],
      } as unknown as BulkUpdateTaskResult)
  );
  (auditLogger.log as jest.Mock).mockClear();
  (migrateLegacyActions as jest.Mock).mockResolvedValue({
    hasLegacyActions: false,
    resultedActions: [],
    resultedReferences: [],
  });
});

setGlobalDate();

describe('bulkEnableRules', () => {
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;

  const mockCreatePointInTimeFinderAsInternalUser = (
    response = { saved_objects: [disabledRule1, disabledRule2] }
  ) => {
    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield response;
        },
      });
  };

  const mockUnsecuredSavedObjectFind = (total: number) => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [
            {
              key: ['fakeType', 'fakeConsumer'],
              key_as_string: 'fakeType|fakeConsumer',
              doc_count: total,
            },
          ],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total,
    });
  };

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });
    mockCreatePointInTimeFinderAsInternalUser();
    mockUnsecuredSavedObjectFind(2);
    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action:id');
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
  });

  test('should enable two rules', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
    });

    const result = await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
        expect.objectContaining({
          id: 'id2',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();

    expect(taskManager.bulkEnable).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['id1', 'id2']);

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
      total: 2,
      taskIdsFailedToBeEnabled: [],
    });
  });

  test('should enable two rules and return right actions', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [enabledRuleForBulkOpsWithActions1, enabledRuleForBulkOpsWithActions2],
    });

    const result = await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
        expect.objectContaining({
          id: 'id2',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedRuleForBulkEnableWithActions1, returnedRuleForBulkEnableWithActions2],
      taskIdsFailedToBeEnabled: [],
      total: 2,
    });
  });

  test('should try to enable rules, one successful and one with 500 error', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [enabledRuleForBulkOps1, savedObjectWith500Error],
    });

    const result = await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 500 }],
      rules: [returnedRuleForBulkOps1],
      total: 2,
      taskIdsFailedToBeEnabled: [],
    });
  });

  test('should try to enable rules, one successful and one with 409 error, which will not be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkCreate
      .mockResolvedValueOnce({
        saved_objects: [enabledRuleForBulkOps1, savedObjectWith409Error],
      })
      .mockResolvedValueOnce({
        saved_objects: [savedObjectWith409Error],
      })
      .mockResolvedValueOnce({
        saved_objects: [savedObjectWith409Error],
      })
      .mockResolvedValueOnce({
        saved_objects: [savedObjectWith409Error],
      });

    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule1, disabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule2] };
        },
      });

    const result = await rulesClient.bulkEnableRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(4);
    expect(result).toStrictEqual({
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 409 }],
      rules: [returnedRuleForBulkOps1],
      total: 2,
      taskIdsFailedToBeEnabled: [],
    });
  });

  test('should try to enable rules, one successful and one with 409 error, which successfully will be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkCreate
      .mockResolvedValueOnce({
        saved_objects: [enabledRuleForBulkOps1, savedObjectWith409Error],
      })
      .mockResolvedValueOnce({
        saved_objects: [enabledRuleForBulkOps2],
      });

    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule1, disabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [disabledRule2] };
        },
      });

    const result = await rulesClient.bulkEnableRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);
    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
      total: 2,
      taskIdsFailedToBeEnabled: [],
    });
  });

  test('should throw an error if number of matched rules greater than 10,000', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 2 }],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 10001,
    });

    await expect(rulesClient.bulkEnableRules({ filter: 'fake_filter' })).rejects.toThrow(
      'More than 10000 rules matched for bulk enable'
    );
  });

  test('should throw an error if we do not get buckets', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {},
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 2,
    });

    await expect(rulesClient.bulkEnableRules({ filter: 'fake_filter' })).rejects.toThrow(
      'No rules found for bulk enable'
    );
  });

  test('should throw if there are actions, but do not have execute permissions', async () => {
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [disabledRuleWithAction1, disabledRuleWithAction2],
    });

    actionsAuthorization.ensureAuthorized.mockImplementation(() => {
      throw new Error('UPS');
    });

    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [],
    });

    const result = await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toBeCalledWith([], { overwrite: true });
    expect(result).toStrictEqual({
      errors: [
        {
          message: 'Rule not authorized for bulk enable - UPS',
          rule: { id: 'id1', name: 'fakeName' },
        },
        {
          message: 'Rule not authorized for bulk enable - UPS',
          rule: { id: 'id2', name: 'fakeName' },
        },
      ],
      rules: [],
      taskIdsFailedToBeEnabled: [],
      total: 2,
    });
  });

  test('should return both rules if one is already enabled and one is disabled when bulk enable is based on ids', async () => {
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [disabledRule1, enabledRuleForBulkOps2],
    });
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
    });

    const result = await rulesClient.bulkEnableRules({
      ids: ['id1', 'id2'],
    });

    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();

    expect(taskManager.bulkEnable).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['id1', 'id2']);

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
      total: 2,
      taskIdsFailedToBeEnabled: [],
    });
  });

  test('should return both rules if one is already enabled and one is disabled when bulk enable is based on filters', async () => {
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [disabledRule1, enabledRuleForBulkOps2],
    });
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
    });

    const result = await rulesClient.bulkEnableRules({
      filter: 'fake_filter',
    });

    expect(taskManager.bulkSchedule).not.toHaveBeenCalled();

    expect(taskManager.bulkEnable).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkEnable).toHaveBeenCalledWith(['id1', 'id2']);

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: true,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
      total: 2,
      taskIdsFailedToBeEnabled: [],
    });
  });

  describe('taskManager', () => {
    test('should return task id if enabling task failed', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
      });
      taskManager.bulkEnable.mockImplementation(async () => ({
        tasks: [taskManagerMock.createTask({ id: 'id1' })],
        errors: [
          {
            type: 'task',
            id: 'id2',
            error: {
              error: '',
              message: 'UPS',
              statusCode: 500,
            },
          },
        ],
      }));

      const result = await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully enabled schedules for underlying tasks: id1'
      );
      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith('Failure to enable schedules for underlying tasks: id2');

      expect(result).toStrictEqual({
        errors: [],
        rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
        total: 2,
        taskIdsFailedToBeEnabled: ['id2'],
      });
    });

    test('should not throw an error if taskManager throw an error', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
      });
      taskManager.bulkEnable.mockImplementation(() => {
        throw new Error('UPS');
      });

      const result = await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith(
        'Failure to enable schedules for underlying tasks: id1, id2. TaskManager bulkEnable failed with Error: UPS'
      );

      expect(result).toStrictEqual({
        errors: [],
        rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
        taskIdsFailedToBeEnabled: ['id1', 'id2'],
        total: 2,
      });
    });

    test('should call task manager bulkEnable for two tasks', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
      });

      await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkEnable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkEnable).toHaveBeenCalledWith(['id1', 'id2']);
    });

    test('should should call task manager bulkEnable only for one task, if one rule have an error', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, savedObjectWith500Error],
      });

      await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkEnable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkEnable).toHaveBeenCalledWith(['id1']);
    });

    test('should skip task if rule is already enabled', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [disabledRule1, enabledRuleForBulkOps2],
      });
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1],
      });

      taskManager.bulkEnable.mockImplementation(
        async () =>
          ({
            tasks: [{ id: 'id1' }],
            errors: [],
          } as unknown as BulkUpdateTaskResult)
      );

      await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkEnable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkEnable).toHaveBeenCalledWith(['id1']);

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully enabled schedules for underlying tasks: id1'
      );
      expect(logger.error).toBeCalledTimes(0);
    });

    test('should schedule task when scheduledTaskId is defined but task with that ID does not', async () => {
      // One rule gets the task successfully, one rule doesn't so only one task should be scheduled
      taskManager.get.mockRejectedValueOnce(new Error('Failed to get task!'));
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
      });

      const result = await rulesClient.bulkEnableRules({ ids: ['id1', 'id2'] });

      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'id1',
          taskType: `alerting:fakeType`,
          params: {
            alertId: 'id1',
            spaceId: 'default',
            consumer: 'fakeConsumer',
          },
          schedule: {
            interval: '5m',
          },
          enabled: false,
          state: {
            alertInstances: {},
            alertTypeState: {},
            previousStartedAt: null,
          },
          scope: ['alerting'],
        },
      ]);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'id1',
            attributes: expect.objectContaining({
              enabled: true,
            }),
          }),
          expect.objectContaining({
            id: 'id2',
            attributes: expect.objectContaining({
              enabled: true,
            }),
          }),
        ]),
        { overwrite: true }
      );

      expect(result).toStrictEqual({
        errors: [],
        rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
        total: 2,
        taskIdsFailedToBeEnabled: [],
      });
    });

    test('should schedule task when scheduledTaskId is not defined', async () => {
      encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
        .fn()
        .mockResolvedValueOnce({
          close: jest.fn(),
          find: function* asyncGenerator() {
            yield {
              saved_objects: [
                {
                  ...disabledRule1,
                  attributes: { ...disabledRule1.attributes, scheduledTaskId: null },
                },
                disabledRule2,
              ],
            };
          },
        });
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
      });
      const result = await rulesClient.bulkEnableRules({ ids: ['id1', 'id2'] });

      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'id1',
          taskType: `alerting:fakeType`,
          params: {
            alertId: 'id1',
            spaceId: 'default',
            consumer: 'fakeConsumer',
          },
          schedule: {
            interval: '5m',
          },
          enabled: false,
          state: {
            alertInstances: {},
            alertTypeState: {},
            previousStartedAt: null,
          },
          scope: ['alerting'],
        },
      ]);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'id1',
            attributes: expect.objectContaining({
              enabled: true,
            }),
          }),
          expect.objectContaining({
            id: 'id2',
            attributes: expect.objectContaining({
              enabled: true,
            }),
          }),
        ]),
        { overwrite: true }
      );

      expect(result).toStrictEqual({
        errors: [],
        rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
        total: 2,
        taskIdsFailedToBeEnabled: [],
      });
    });

    test('should schedule task when task with scheduledTaskId exists but is unrecognized', async () => {
      taskManager.get.mockResolvedValueOnce({
        id: 'task-123',
        taskType: 'alerting:123',
        scheduledAt: new Date(),
        attempts: 1,
        status: TaskStatus.Unrecognized,
        runAt: new Date(),
        startedAt: null,
        retryAt: null,
        state: {},
        params: {
          alertId: '1',
        },
        ownerId: null,
        enabled: false,
      });
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2],
      });

      const result = await rulesClient.bulkEnableRules({ ids: ['id1', 'id2'] });

      expect(taskManager.removeIfExists).toHaveBeenCalledTimes(1);
      expect(taskManager.removeIfExists).toHaveBeenCalledWith('id1');
      expect(taskManager.bulkSchedule).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkSchedule).toHaveBeenCalledWith([
        {
          id: 'id1',
          taskType: `alerting:fakeType`,
          params: {
            alertId: 'id1',
            spaceId: 'default',
            consumer: 'fakeConsumer',
          },
          schedule: {
            interval: '5m',
          },
          enabled: false,
          state: {
            alertInstances: {},
            alertTypeState: {},
            previousStartedAt: null,
          },
          scope: ['alerting'],
        },
      ]);

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'id1',
            attributes: expect.objectContaining({
              enabled: true,
            }),
          }),
          expect.objectContaining({
            id: 'id2',
            attributes: expect.objectContaining({
              enabled: true,
            }),
          }),
        ]),
        { overwrite: true }
      );

      expect(result).toStrictEqual({
        errors: [],
        rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
        total: 2,
        taskIdsFailedToBeEnabled: [],
      });
    });
  });

  describe('auditLogger', () => {
    jest.spyOn(auditLogger, 'log').mockImplementation();

    test('logs audit event when enabling rules', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [enabledRuleForBulkOps1],
      });

      await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_enable');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[0][0]?.kibana).toEqual({
        saved_object: { id: 'id1', type: RULE_SAVED_OBJECT_TYPE },
      });
      expect(auditLogger.log.mock.calls[1][0]?.event?.action).toEqual('rule_enable');
      expect(auditLogger.log.mock.calls[1][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[1][0]?.kibana).toEqual({
        saved_object: { id: 'id2', type: RULE_SAVED_OBJECT_TYPE },
      });
    });

    test('logs audit event when authentication failed', async () => {
      authorization.ensureAuthorized.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(rulesClient.bulkEnableRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Unauthorized'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_enable');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });

    test('logs audit event when getting an authorization filter failed', async () => {
      authorization.getFindAuthorizationFilter.mockImplementation(() => {
        throw new Error('Error');
      });

      await expect(rulesClient.bulkEnableRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Error'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_enable');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });
  });

  describe('legacy actions migration for SIEM', () => {
    test('should call migrateLegacyActions', async () => {
      encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
        .fn()
        .mockResolvedValueOnce({
          close: jest.fn(),
          find: function* asyncGenerator() {
            yield {
              saved_objects: [
                disabledRuleForBulkDisable1,
                siemRuleForBulkOps1,
                siemRuleForBulkOps2,
              ],
            };
          },
        });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRuleForBulkDisable1, siemRuleForBulkOps1, siemRuleForBulkOps2],
      });

      await rulesClient.bulkEnableRules({ filter: 'fake_filter' });

      expect(migrateLegacyActions).toHaveBeenCalledTimes(3);
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: disabledRuleForBulkDisable1.attributes,
        ruleId: disabledRuleForBulkDisable1.id,
        actions: [],
        references: [],
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: expect.objectContaining({ consumer: AlertConsumers.SIEM }),
        ruleId: siemRuleForBulkOps1.id,
        actions: [],
        references: [],
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        attributes: expect.objectContaining({ consumer: AlertConsumers.SIEM }),
        ruleId: siemRuleForBulkOps2.id,
        actions: [],
        references: [],
      });
    });
  });
});

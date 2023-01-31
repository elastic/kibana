/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { loggerMock } from '@kbn/logging-mocks';
import { BulkUpdateTaskResult } from '@kbn/task-manager-plugin/server/task_scheduling';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/mocks';
import {
  disabledRule1,
  disabledRule2,
  enabledRule1,
  enabledRule2,
  savedObjectWith409Error,
  savedObjectWith500Error,
  returnedDisabledRule1,
  returnedDisabledRule2,
} from './test_helpers';

jest.mock('../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

jest.mock('../../task_runner/alert_task_instance', () => ({
  taskInstanceToAlertTaskInstance: jest.fn(),
}));

const { taskInstanceToAlertTaskInstance } = jest.requireMock(
  '../../task_runner/alert_task_instance'
);

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const logger = loggerMock.create();
const eventLogger = eventLoggerMock.create();

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
  encryptedSavedObjectsClient: encryptedSavedObjects,
  getActionsClient: jest.fn(),
  getEventLogClient: jest.fn(),
  kibanaVersion,
  auditLogger,
  eventLogger,
  minimumScheduleInterval: { value: '1m', enforce: false },
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('bulkDisableRules', () => {
  let rulesClient: RulesClient;
  const mockCreatePointInTimeFinderAsInternalUser = (
    response = { saved_objects: [enabledRule1, enabledRule2] }
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
  });

  test('should disable two rule', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [disabledRule1, disabledRule2],
    });

    const result = await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: false,
          }),
        }),
        expect.objectContaining({
          id: 'id2',
          attributes: expect.objectContaining({
            enabled: false,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedDisabledRule1, returnedDisabledRule2],
      total: 2,
    });
  });

  test('should try to disable rules, one successful and one with 500 error', async () => {
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [disabledRule1, savedObjectWith500Error],
    });

    const result = await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: false,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 500 }],
      rules: [returnedDisabledRule1],
      total: 2,
    });
  });

  test('should try to disable rules, one successful and one with 409 error, which will not be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkCreate
      .mockResolvedValueOnce({
        saved_objects: [disabledRule1, savedObjectWith409Error],
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
          yield { saved_objects: [enabledRule1, enabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRule2] };
        },
      });

    const result = await rulesClient.bulkDisableRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(4);
    expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkDisable).toHaveBeenCalledWith(['id1']);
    expect(result).toStrictEqual({
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 409 }],
      rules: [returnedDisabledRule1],
      total: 2,
    });
  });

  test('should try to disable rules, one successful and one with 409 error, which successfully will be disabled with retry', async () => {
    unsecuredSavedObjectsClient.bulkCreate
      .mockResolvedValueOnce({
        saved_objects: [disabledRule1, savedObjectWith409Error],
      })
      .mockResolvedValueOnce({
        saved_objects: [disabledRule2],
      });

    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRule1, enabledRule2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRule1] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRule1] };
        },
      });

    const result = await rulesClient.bulkDisableRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(2);

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedDisabledRule1, returnedDisabledRule2],
      total: 2,
    });
  });

  test('should thow an error if number of matched rules greater than 10,000', async () => {
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

    await expect(rulesClient.bulkDisableRules({ filter: 'fake_filter' })).rejects.toThrow(
      'More than 10000 rules matched for bulk disable'
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

    await expect(rulesClient.bulkDisableRules({ filter: 'fake_filter' })).rejects.toThrow(
      'No rules found for bulk disable'
    );
  });

  test('should skip rule if it is already disabled', async () => {
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [enabledRule1, disabledRule2],
    });
    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [disabledRule1],
    });

    const result = await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'id1',
          attributes: expect.objectContaining({
            enabled: false,
          }),
        }),
      ]),
      { overwrite: true }
    );

    expect(result).toStrictEqual({
      errors: [],
      rules: [returnedDisabledRule1],
      total: 2,
    });
  });

  describe('taskManager', () => {
    test('should call task manager bulkDisable', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1, disabledRule2],
      });

      taskManager.bulkDisable.mockResolvedValue({
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
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith(['id1', 'id2']);

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully disabled schedules for underlying tasks: id1'
      );
      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith('Failure to disable schedules for underlying tasks: id2');
    });

    test('should call task manager bulkDeleteIfExist', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...enabledRule1,
            attributes: {
              ...enabledRule1.attributes,
              scheduledTaskId: 'taskId1',
            },
          } as SavedObject,
          {
            ...enabledRule2,
            attributes: {
              ...enabledRule1,
              scheduledTaskId: 'taskId2',
            },
          } as SavedObject,
        ],
      });

      taskManager.bulkRemoveIfExist.mockResolvedValue({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          { id: 'id2', type: 'alert', success: false },
        ],
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledWith(['taskId1', 'taskId2']);

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully deleted schedules for underlying tasks: id1'
      );
      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith('Failure to delete schedules for underlying tasks: id2');
    });

    test('should disable one task if one rule was successfully disabled and one has 500 error', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1, savedObjectWith500Error],
      });

      taskManager.bulkDisable.mockResolvedValue({
        tasks: [{ id: 'id1' }],
        errors: [],
      } as unknown as BulkUpdateTaskResult);

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith(['id1']);

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully disabled schedules for underlying tasks: id1'
      );
      expect(logger.error).toBeCalledTimes(0);
    });

    test('should disable one task if one rule was successfully disabled and one was disabled from beginning', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          enabledRule1,
          {
            ...enabledRule2,
            attributes: { ...enabledRule2.attributes, enabled: false },
          },
        ],
      });
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1],
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(taskManager.bulkDisable).toHaveBeenCalledTimes(1);
      expect(taskManager.bulkDisable).toHaveBeenCalledWith(['id1']);
    });

    test('should not throw an error if taskManager.bulkDisable throw an error', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1, disabledRule2],
      });
      taskManager.bulkDisable.mockImplementation(() => {
        throw new Error('Something happend during bulkDisable');
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failure to disable schedules for underlying tasks: id1, id2. TaskManager bulkDisable failed with Error: Something happend during bulkDisable'
      );
    });

    test('should not throw an error if taskManager.bulkRemoveIfExist throw an error', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [
          {
            ...disabledRule1,
            attributes: {
              ...disabledRule1.attributes,
              scheduledTaskId: 'taskId1',
            },
          } as SavedObject,
        ],
      });

      taskManager.bulkRemoveIfExist.mockImplementation(() => {
        throw new Error('Something happend during bulkRemoveIfExist');
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failure to delete schedules for underlying tasks: taskId1. TaskManager bulkRemoveIfExist failed with Error: Something happend during bulkRemoveIfExist'
      );
    });
  });

  describe('auditLogger', () => {
    jest.spyOn(auditLogger, 'log').mockImplementation();

    test('logs audit event when disabling rules', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1],
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_disable');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[0][0]?.kibana).toEqual({
        saved_object: { id: 'id1', type: 'alert' },
      });
      expect(auditLogger.log.mock.calls[1][0]?.event?.action).toEqual('rule_disable');
      expect(auditLogger.log.mock.calls[1][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[1][0]?.kibana).toEqual({
        saved_object: { id: 'id2', type: 'alert' },
      });
    });

    test('logs audit event when authentication failed', async () => {
      authorization.ensureAuthorized.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(rulesClient.bulkDisableRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Unauthorized'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_disable');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });

    test('logs audit event when getting an authorization filter failed', async () => {
      authorization.getFindAuthorizationFilter.mockImplementation(() => {
        throw new Error('Error');
      });

      await expect(rulesClient.bulkDisableRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Error'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_disable');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });
  });

  describe('recoverRuleAlerts', () => {
    beforeEach(() => {
      taskInstanceToAlertTaskInstance.mockImplementation(() => ({
        state: {
          alertInstances: {
            '1': {
              meta: {
                lastScheduledActions: {
                  group: 'default',
                  date: new Date().toISOString(),
                },
              },
              state: { bar: false },
            },
          },
        },
      }));
    });
    test('should call logEvent', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1, disabledRule2],
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    });

    test('should call logger.warn', async () => {
      eventLogger.logEvent.mockImplementation(() => {
        throw new Error('UPS');
      });
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [disabledRule1, disabledRule2],
      });

      await rulesClient.bulkDisableRules({ filter: 'fake_filter' });

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenLastCalledWith(
        "rulesClient.disable('id2') - Could not write recovery events - UPS"
      );
    });
  });
});

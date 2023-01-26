/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { RecoveredActionGroup } from '../../../common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import { loggerMock } from '@kbn/logging-mocks';
import { enabledRule1, enabledRule2, returnedRule1, returnedRule2 } from './test_helpers';

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
const logger = loggerMock.create();

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
  minimumScheduleInterval: { value: '1m', enforce: false },
};

const getBulkOperationStatusErrorResponse = (statusCode: number) => ({
  id: 'id2',
  type: 'alert',
  success: false,
  error: {
    error: '',
    message: 'UPS',
    statusCode,
  },
});

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  jest.clearAllMocks();
});

setGlobalDate();

describe('bulkDelete', () => {
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

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);
    mockCreatePointInTimeFinderAsInternalUser();
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 2 }],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 2,
    });

    ruleTypeRegistry.get.mockReturnValue({
      id: 'myType',
      name: 'Test',
      actionGroups: [
        { id: 'default', name: 'Default' },
        { id: 'custom', name: 'Not the Default' },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      async executor() {
        return { state: {} };
      },
      producer: 'alerts',
    });
  });

  test('should try to delete rules, one successful and one with 500 error', async () => {
    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'id1', type: 'alert', success: true },
        getBulkOperationStatusErrorResponse(500),
      ],
    });

    const result = await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      enabledRule1,
      enabledRule2,
    ]);
    expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledWith(['id1']);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRule1],
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 500 }],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });
  });

  test('should try to delete rules, one successful and one with 409 error, which will not be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkDelete
      .mockResolvedValueOnce({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          getBulkOperationStatusErrorResponse(409),
        ],
      })
      .mockResolvedValueOnce({
        statuses: [getBulkOperationStatusErrorResponse(409)],
      })
      .mockResolvedValueOnce({
        statuses: [getBulkOperationStatusErrorResponse(409)],
      })
      .mockResolvedValueOnce({
        statuses: [getBulkOperationStatusErrorResponse(409)],
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

    const result = await rulesClient.bulkDeleteRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(4);
    expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledWith(['id1']);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRule1],
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 409 }],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });
  });

  test('should try to delete rules, one successful and one with 409 error, which successfully will be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkDelete
      .mockResolvedValueOnce({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          getBulkOperationStatusErrorResponse(409),
        ],
      })
      .mockResolvedValueOnce({
        statuses: [
          {
            id: 'id2',
            type: 'alert',
            success: true,
          },
        ],
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
      });

    const result = await rulesClient.bulkDeleteRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemoveIfExist).toHaveBeenCalledWith(['id1', 'id2']);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw==', 'MzIxOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRule1, returnedRule2],
      errors: [],
      total: 2,
      taskIdsFailedToBeDeleted: [],
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

    await expect(rulesClient.bulkDeleteRules({ filter: 'fake_filter' })).rejects.toThrow(
      'More than 10000 rules matched for bulk delete'
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

    await expect(rulesClient.bulkDeleteRules({ filter: 'fake_filter' })).rejects.toThrow(
      'No rules found for bulk delete'
    );
  });

  describe('taskManager', () => {
    test('should return task id if deleting task failed', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          { id: 'id2', type: 'alert', success: true },
        ],
      });
      taskManager.bulkRemoveIfExist.mockImplementation(async () => ({
        statuses: [
          {
            id: 'id1',
            type: 'alert',
            success: true,
          },
          getBulkOperationStatusErrorResponse(500),
        ],
      }));

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully deleted schedules for underlying tasks: id1'
      );
      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith('Failure to delete schedules for underlying tasks: id2');
    });

    test('should not throw an error if taskManager throw an error', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          { id: 'id2', type: 'alert', success: true },
        ],
      });
      taskManager.bulkRemoveIfExist.mockImplementation(() => {
        throw new Error('UPS');
      });

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith(
        'Failure to delete schedules for underlying tasks: id1, id2. TaskManager bulkRemoveIfExist failed with Error: UPS'
      );
    });

    test('should not call logger.error if all tasks successfully deleted', async () => {
      mockCreatePointInTimeFinderAsInternalUser();
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          { id: 'id2', type: 'alert', success: true },
        ],
      });
      taskManager.bulkRemoveIfExist.mockImplementation(async () => ({
        statuses: [
          {
            id: 'id1',
            type: 'alert',
            success: true,
          },
          {
            id: 'id2',
            type: 'alert',
            success: true,
          },
        ],
      }));

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(logger.debug).toBeCalledTimes(1);
      expect(logger.debug).toBeCalledWith(
        'Successfully deleted schedules for underlying tasks: id1, id2'
      );
      expect(logger.error).toBeCalledTimes(0);
    });
  });

  describe('auditLogger', () => {
    jest.spyOn(auditLogger, 'log').mockImplementation();

    test('logs audit event when deleting rules', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: 'alert', success: true },
          { id: 'id2', type: 'alert', success: true },
        ],
      });

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[0][0]?.kibana).toEqual({
        saved_object: { id: 'id1', type: 'alert' },
      });
      expect(auditLogger.log.mock.calls[1][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[1][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[1][0]?.kibana).toEqual({
        saved_object: { id: 'id2', type: 'alert' },
      });
    });

    test('logs audit event when authentication failed', async () => {
      authorization.ensureAuthorized.mockImplementation(() => {
        throw new Error('Unauthorized');
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [{ id: 'id1', type: 'alert', success: true }],
      });

      await expect(rulesClient.bulkDeleteRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Unauthorized'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });

    test('logs audit event when getting an authorization filter failed', async () => {
      authorization.getFindAuthorizationFilter.mockImplementation(() => {
        throw new Error('Error');
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [{ id: 'id1', type: 'alert', success: true }],
      });

      await expect(rulesClient.bulkDeleteRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Error'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });
  });
});

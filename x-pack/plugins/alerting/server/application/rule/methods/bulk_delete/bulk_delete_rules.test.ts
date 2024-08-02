/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { schema } from '@kbn/config-schema';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { RecoveredActionGroup } from '../../../../../common';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { bulkMarkApiKeysForInvalidation } from '../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import {
  enabledRuleForBulkOps1,
  enabledRuleForBulkOps2,
  enabledRuleForBulkOps3,
  returnedRuleForBulkOps1,
  returnedRuleForBulkOps2,
  returnedRuleForBulkOps3,
  siemRuleForBulkOps1,
  enabledRuleForBulkOpsWithActions1,
  enabledRuleForBulkOpsWithActions2,
  returnedRuleForBulkEnableWithActions1,
  returnedRuleForBulkEnableWithActions2,
} from '../../../../rules_client/tests/test_helpers';
import { migrateLegacyActions } from '../../../../rules_client/lib';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';

jest.mock('../../../../rules_client/lib/siem_legacy_actions/migrate_legacy_actions', () => {
  return {
    migrateLegacyActions: jest.fn(),
  };
});
(migrateLegacyActions as jest.Mock).mockResolvedValue({
  hasLegacyActions: false,
  resultedActions: [],
  resultedReferences: [],
});

jest.mock('../../../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
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
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const backfillClient = backfillClientMock.create();

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
  backfillClient,
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

const getBulkOperationStatusErrorResponse = (statusCode: number) => ({
  id: 'id2',
  type: RULE_SAVED_OBJECT_TYPE,
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
  let actionsClient: jest.Mocked<ActionsClient>;

  const mockCreatePointInTimeFinderAsInternalUser = (
    response = {
      saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2, enabledRuleForBulkOps3],
    } as unknown
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
      category: 'test',
      producer: 'alerts',
      validate: {
        params: schema.any(),
      },
      validLegacyConsumers: [],
    });

    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action:id');
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
  });

  test('should successfully delete two rule and return right actions', async () => {
    mockCreatePointInTimeFinderAsInternalUser({
      saved_objects: [enabledRuleForBulkOpsWithActions1, enabledRuleForBulkOpsWithActions2],
    });
    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'id1', type: 'alert', success: true },
        { id: 'id2', type: 'alert', success: true },
      ],
    });

    const result = await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith(
      [enabledRuleForBulkOps1, enabledRuleForBulkOps2].map(({ id }) => ({
        id,
        type: 'alert',
      })),
      undefined
    );

    expect(taskManager.bulkRemove).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemove).toHaveBeenCalledWith(['id1', 'id2']);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledTimes(1);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledWith({
      ruleIds: ['id1', 'id2'],
      namespace: 'default',
      unsecuredSavedObjectsClient,
    });
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw==', 'MzIxOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRuleForBulkEnableWithActions1, returnedRuleForBulkEnableWithActions2],
      errors: [],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });
  });

  test('should try to delete rules, two successful and one with 500 error', async () => {
    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
        getBulkOperationStatusErrorResponse(500),
        { id: 'id3', type: RULE_SAVED_OBJECT_TYPE, success: true },
      ],
    });

    const result = await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith(
      [enabledRuleForBulkOps1, enabledRuleForBulkOps2, enabledRuleForBulkOps3].map(({ id }) => ({
        id,
        type: RULE_SAVED_OBJECT_TYPE,
      })),
      undefined
    );

    expect(taskManager.bulkRemove).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemove).toHaveBeenCalledWith(['id1', 'id3']);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledTimes(1);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledWith({
      ruleIds: ['id1', 'id3'],
      namespace: 'default',
      unsecuredSavedObjectsClient,
    });
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps3],
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 500 }],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });
  });

  test('should try to delete rules, one successful and one with 409 error, which will not be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkDelete
      .mockResolvedValueOnce({
        statuses: [
          { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
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
          yield { saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRuleForBulkOps2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRuleForBulkOps2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRuleForBulkOps2] };
        },
      });

    const result = await rulesClient.bulkDeleteRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(4);
    expect(taskManager.bulkRemove).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemove).toHaveBeenCalledWith(['id1']);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledTimes(1);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledWith({
      ruleIds: ['id1'],
      namespace: 'default',
      unsecuredSavedObjectsClient,
    });
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRuleForBulkOps1],
      errors: [{ message: 'UPS', rule: { id: 'id2', name: 'fakeName' }, status: 409 }],
      total: 2,
      taskIdsFailedToBeDeleted: [],
    });
  });

  test('should try to delete rules, one successful and one with 409 error, which successfully will be deleted with retry', async () => {
    unsecuredSavedObjectsClient.bulkDelete
      .mockResolvedValueOnce({
        statuses: [
          { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          getBulkOperationStatusErrorResponse(409),
        ],
      })
      .mockResolvedValueOnce({
        statuses: [
          {
            id: 'id2',
            type: RULE_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

    encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
      .fn()
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRuleForBulkOps2] };
        },
      })
      .mockResolvedValueOnce({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield { saved_objects: [enabledRuleForBulkOps2] };
        },
      });

    const result = await rulesClient.bulkDeleteRules({ ids: ['id1', 'id2'] });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledTimes(2);
    expect(taskManager.bulkRemove).toHaveBeenCalledTimes(1);
    expect(taskManager.bulkRemove).toHaveBeenCalledWith(['id1', 'id2']);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledTimes(1);
    expect(backfillClient.deleteBackfillForRules).toHaveBeenCalledWith({
      ruleIds: ['id1', 'id2'],
      namespace: 'default',
      unsecuredSavedObjectsClient,
    });
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw==', 'MzIxOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
    expect(result).toStrictEqual({
      rules: [returnedRuleForBulkOps1, returnedRuleForBulkOps2],
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

  test('should not mark API keys for invalidation if the user is authenticated using an api key', async () => {
    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'id3', type: RULE_SAVED_OBJECT_TYPE, success: true },
        { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
        { id: 'id2', type: RULE_SAVED_OBJECT_TYPE, success: true },
      ],
    });

    await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
      { apiKeys: ['MTIzOmFiYw==', 'MzIxOmFiYw=='] },
      expect.anything(),
      expect.anything()
    );
  });

  describe('taskManager', () => {
    test('should return task id if deleting task failed', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'id2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });
      taskManager.bulkRemove.mockImplementation(async () => ({
        statuses: [
          {
            id: 'id1',
            type: RULE_SAVED_OBJECT_TYPE,
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
          { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'id2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });
      taskManager.bulkRemove.mockImplementation(() => {
        throw new Error('UPS');
      });

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(logger.error).toBeCalledTimes(1);
      expect(logger.error).toBeCalledWith(
        'Failure to delete schedules for underlying tasks: id1, id2. TaskManager bulkRemove failed with Error: UPS'
      );
    });

    test('should not call logger.error if all tasks successfully deleted', async () => {
      mockCreatePointInTimeFinderAsInternalUser();
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'id2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });
      taskManager.bulkRemove.mockImplementation(async () => ({
        statuses: [
          {
            id: 'id1',
            type: RULE_SAVED_OBJECT_TYPE,
            success: true,
          },
          {
            id: 'id2',
            type: RULE_SAVED_OBJECT_TYPE,
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

  describe('legacy actions migration for SIEM', () => {
    test('should call migrateLegacyActions', async () => {
      encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser = jest
        .fn()
        .mockResolvedValueOnce({
          close: jest.fn(),
          find: function* asyncGenerator() {
            yield {
              saved_objects: [enabledRuleForBulkOps1, enabledRuleForBulkOps2, siemRuleForBulkOps1],
            };
          },
        });

      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: enabledRuleForBulkOps1.id, type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: enabledRuleForBulkOps2.id, type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: siemRuleForBulkOps1.id, type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(migrateLegacyActions).toHaveBeenCalledTimes(3);
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        ruleId: enabledRuleForBulkOps1.id,
        skipActionsValidation: true,
        attributes: enabledRuleForBulkOps1.attributes,
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        ruleId: enabledRuleForBulkOps2.id,
        skipActionsValidation: true,
        attributes: enabledRuleForBulkOps2.attributes,
      });
      expect(migrateLegacyActions).toHaveBeenCalledWith(expect.any(Object), {
        ruleId: siemRuleForBulkOps1.id,
        skipActionsValidation: true,
        attributes: siemRuleForBulkOps1.attributes,
      });
    });
  });

  describe('auditLogger', () => {
    jest.spyOn(auditLogger, 'log').mockImplementation();

    test('logs audit event when deleting rules', async () => {
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          { id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true },
          { id: 'id2', type: RULE_SAVED_OBJECT_TYPE, success: true },
        ],
      });

      await rulesClient.bulkDeleteRules({ filter: 'fake_filter' });

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[0][0]?.kibana).toEqual({
        saved_object: { id: 'id1', type: RULE_SAVED_OBJECT_TYPE },
      });
      expect(auditLogger.log.mock.calls[1][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[1][0]?.event?.outcome).toEqual('unknown');
      expect(auditLogger.log.mock.calls[1][0]?.kibana).toEqual({
        saved_object: { id: 'id2', type: RULE_SAVED_OBJECT_TYPE },
      });
    });

    test('logs audit event when authentication failed', async () => {
      authorization.ensureAuthorized.mockImplementation(() => {
        throw new Error('Unauthorized');
      });
      unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [{ id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true }],
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
        statuses: [{ id: 'id1', type: RULE_SAVED_OBJECT_TYPE, success: true }],
      });

      await expect(rulesClient.bulkDeleteRules({ filter: 'fake_filter' })).rejects.toThrowError(
        'Error'
      );

      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toEqual('rule_delete');
      expect(auditLogger.log.mock.calls[0][0]?.event?.outcome).toEqual('failure');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { RecoveredActionGroup, AlertTypeParams } from '../../../common';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '../../../../actions/server';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';

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

const kibanaVersion = 'v8.2.0';
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

describe('bulkEdit()', () => {
  let rulesClient: RulesClient;
  let actionsClient: jest.Mocked<ActionsClient>;
  const existingAlert = {
    id: '1',
    type: 'alert',
    attributes: {
      enabled: false,
      tags: ['foo'],
      alertTypeId: 'myType',
      schedule: { interval: '1m' },
      consumer: 'myApp',
      scheduledTaskId: 'task-123',
      params: {},
      throttle: null,
      notifyWhen: null,
      actions: [],
      name: 'my alert name',
    },
    references: [],
    version: '123',
  };
  const existingDecryptedAlert = {
    ...existingAlert,
    attributes: {
      ...existingAlert.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  const mockCreatePointInTimeFinderAsInternalUser = (
    response = { saved_objects: [existingDecryptedAlert] }
  ) => {
    encryptedSavedObjects.createPointInTimeFinderAsInternalUser = jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield response;
      },
    });
  };

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    unsecuredSavedObjectsClient.find.mockResolvedValue({
      aggregations: {
        alertTypeId: {
          buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 }],
        },
      },
      saved_objects: [],
      per_page: 0,
      page: 0,
      total: 1,
    });

    mockCreatePointInTimeFinderAsInternalUser();

    unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
      saved_objects: [existingAlert],
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
      async executor() {},
      producer: 'alerts',
    });
  });
  describe('tags operations', () => {
    test('should add new tag', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: 'alert',
            attributes: {
              enabled: true,
              tags: ['foo', 'test-1'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(result.total).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('tags', ['foo', 'test-1']);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          id: '1',
          type: 'alert',
          attributes: expect.objectContaining({
            tags: ['foo', 'test-1'],
          }),
        }),
      ]);
    });

    test('should delete tag', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: 'alert',
            attributes: {
              enabled: true,
              tags: [],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'delete',
            value: ['foo'],
          },
        ],
      });

      expect(result.rules[0]).toHaveProperty('tags', []);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          id: '1',
          type: 'alert',
          attributes: expect.objectContaining({
            tags: [],
          }),
        }),
      ]);
    });

    test('should set tags', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: 'alert',
            attributes: {
              enabled: true,
              tags: ['test-1', 'test-2'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              params: {},
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [
          {
            field: 'tags',
            operation: 'set',
            value: ['test-1', 'test-2'],
          },
        ],
      });

      expect(result.rules[0]).toHaveProperty('tags', ['test-1', 'test-2']);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          id: '1',
          type: 'alert',
          attributes: expect.objectContaining({
            tags: ['test-1', 'test-2'],
          }),
        }),
      ]);
    });
  });

  describe('ruleTypes aggregation and validation', () => {
    test('should call unsecuredSavedObjectsClient.find for aggregations by alertTypeId and consumer', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                {
                  field: 'alert.attributes.alertTypeId',
                },
                {
                  field: 'alert.attributes.consumer',
                },
              ],
            },
          },
        },
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'alert.attributes.tags',
            },
            {
              type: 'literal',
              value: 'APM',
            },
            {
              type: 'literal',
              value: true,
            },
          ],
          function: 'is',
          type: 'function',
        },
        page: 1,
        perPage: 0,
        type: 'alert',
      });
    });
    test('should call unsecuredSavedObjectsClient.find for aggregations when called with ids options', async () => {
      await rulesClient.bulkEdit({
        ids: ['2', '3'],
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        aggs: {
          alertTypeId: {
            multi_terms: {
              terms: [
                {
                  field: 'alert.attributes.alertTypeId',
                },
                {
                  field: 'alert.attributes.consumer',
                },
              ],
            },
          },
        },
        filter: {
          arguments: [
            {
              arguments: [
                {
                  type: 'literal',
                  value: 'alert.id',
                },
                {
                  type: 'literal',
                  value: 'alert:2',
                },
                {
                  type: 'literal',
                  value: true,
                },
              ],
              function: 'is',
              type: 'function',
            },
            {
              arguments: [
                {
                  type: 'literal',
                  value: 'alert.id',
                },
                {
                  type: 'literal',
                  value: 'alert:3',
                },
                {
                  type: 'literal',
                  value: true,
                },
              ],
              function: 'is',
              type: 'function',
            },
          ],
          function: 'or',
          type: 'function',
        },
        page: 1,
        perPage: 0,
        type: 'alert',
      });
    });
    test('should throw if number of matched rules greater than 10_000', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        aggregations: {
          alertTypeId: {
            buckets: [{ key: ['myType', 'myApp'], key_as_string: 'myType|myApp', doc_count: 1 }],
          },
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 10001,
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('More than 10000 rules matched for bulk edit');
    });

    test('should throw if aggregations result is invalid', async () => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        aggregations: {
          alertTypeId: {},
        },
        saved_objects: [],
        per_page: 0,
        page: 0,
        total: 0,
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('No rules found for bulk edit');
    });

    test('should throw if ruleType is not enabled', async () => {
      ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
        throw new Error('Not enabled');
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('Not enabled');

      expect(ruleTypeRegistry.ensureRuleTypeEnabled).toHaveBeenLastCalledWith('myType');
    });

    test('should throw if ruleType is not authorized', async () => {
      authorization.ensureAuthorized.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow('Unauthorized');

      expect(authorization.ensureAuthorized).toHaveBeenLastCalledWith({
        consumer: 'myApp',
        entity: 'rule',
        operation: 'bulkEdit',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('apiKeys', () => {
    test('should call createPointInTimeFinderAsInternalUser that returns api Keys', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(encryptedSavedObjects.createPointInTimeFinderAsInternalUser).toHaveBeenCalledWith({
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'alert.attributes.tags',
            },
            {
              type: 'literal',
              value: 'APM',
            },
            {
              type: 'literal',
              value: true,
            },
          ],
          function: 'is',
          type: 'function',
        },
        perPage: 1000,
        type: 'alert',
        namespaces: ['default'],
      });
    });

    test('should call bulkMarkApiKeysForInvalidation if apiKey present', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['MTIzOmFiYw=='] },
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should not call bulkMarkApiKeysForInvalidation if apiKey absent', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingAlert,
            attributes: { ...existingAlert.attributes, apiKey: undefined as unknown as string },
          },
        ],
      });
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(bulkMarkApiKeysForInvalidation).not.toHaveBeenCalled();
    });

    test('should not call create apiKey if rule is disabled', async () => {
      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });
      expect(rulesClientParams.createAPIKey).not.toHaveBeenCalledWith();
    });

    test('should return error in rule errors if key is not generated', async () => {
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedAlert,
            attributes: { ...existingDecryptedAlert.attributes, enabled: true },
          },
        ],
      });

      await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });
      expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/my alert name');
    });
  });

  describe('params validation', () => {
    test('should return error for rule that failed params validation', async () => {
      ruleTypeRegistry.get.mockReturnValue({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
        async executor() {},
        producer: 'alerts',
      });

      const result = await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(result.errors).toHaveLength(1);

      expect(result.errors[0]).toHaveProperty(
        'message',
        'params invalid: [param1]: expected value of type [string] but got [undefined]'
      );
      expect(result.errors[0]).toHaveProperty('rule.id', '1');
      expect(result.errors[0]).toHaveProperty('rule.name', 'my alert name');
    });

    test('should validate mutatedParams for rules', async () => {
      ruleTypeRegistry.get.mockReturnValue({
        id: '123',
        name: 'Test',
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        validate: {
          params: {
            validate: (rule) => rule as AlertTypeParams,
            validateMutatedParams: (rule: unknown) => {
              throw Error('Mutated error for rule');
            },
          },
        },
        async executor() {},
        producer: 'alerts',
      });

      const result = await rulesClient.bulkEdit({
        filter: 'alert.attributes.tags: "APM"',
        operations: [
          {
            field: 'tags',
            operation: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(result.errors).toHaveLength(1);

      expect(result.errors[0]).toHaveProperty(
        'message',
        'Mutated params invalid: Mutated error for rule'
      );
      expect(result.errors[0]).toHaveProperty('rule.id', '1');
      expect(result.errors[0]).toHaveProperty('rule.name', 'my alert name');
    });
  });

  describe('paramsModifier', () => {
    test('should update index pattern params', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: '1',
            type: 'alert',
            attributes: {
              enabled: true,
              tags: ['foo'],
              alertTypeId: 'myType',
              schedule: { interval: '1m' },
              consumer: 'myApp',
              scheduledTaskId: 'task-123',
              params: { index: ['test-index-*'] },
              throttle: null,
              notifyWhen: null,
              actions: [],
            },
            references: [],
            version: '123',
          },
        ],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [],
        paramsModifier: async (params) => {
          params.index = ['test-index-*'];

          return params;
        },
      });

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('params.index', ['test-index-*']);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        expect.objectContaining({
          id: '1',
          type: 'alert',
          attributes: expect.objectContaining({
            params: expect.objectContaining({
              index: ['test-index-*'],
            }),
          }),
        }),
      ]);
    });
  });

  describe('method input validation', () => {
    test('should throw error when both ids and filter supplied in method call', async () => {
      await expect(
        rulesClient.bulkEdit({
          filter: 'alert.attributes.tags: "APM"',
          ids: ['1', '2'],
          operations: [
            {
              field: 'tags',
              operation: 'add',
              value: ['test-1'],
            },
          ],
        })
      ).rejects.toThrow(
        "Both 'filter' and 'ids' are supplied. Define either 'ids' or 'filter' properties in method arguments"
      );
    });
  });
});

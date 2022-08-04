/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { RecoveredActionGroup, RuleTypeParams } from '../../../common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
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
  const existingRule = {
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
      name: 'my rule name',
    },
    references: [],
    version: '123',
  };
  const existingDecryptedRule = {
    ...existingRule,
    attributes: {
      ...existingRule.attributes,
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
  };

  const mockCreatePointInTimeFinderAsInternalUser = (
    response = { saved_objects: [existingDecryptedRule] }
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

    unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
      saved_objects: [existingRule],
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
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: 'alert',
            attributes: expect.objectContaining({
              tags: ['foo', 'test-1'],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should delete tag', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: 'alert',
            attributes: expect.objectContaining({
              tags: [],
            }),
          }),
        ],
        { overwrite: true }
      );
    });

    test('should set tags', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: 'alert',
            attributes: expect.objectContaining({
              tags: ['test-1', 'test-2'],
            }),
          }),
        ],
        { overwrite: true }
      );
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
              isQuoted: false,
            },
            {
              type: 'literal',
              value: 'APM',
              isQuoted: true,
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
                  isQuoted: false,
                },
                {
                  type: 'literal',
                  value: 'alert:2',
                  isQuoted: false,
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
                  isQuoted: false,
                },
                {
                  type: 'literal',
                  value: 'alert:3',
                  isQuoted: false,
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
    test('should call createPointInTimeFinderDecryptedAsInternalUser that returns api Keys', async () => {
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

      expect(
        encryptedSavedObjects.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith({
        filter: {
          arguments: [
            {
              type: 'literal',
              value: 'alert.attributes.tags',
              isQuoted: false,
            },
            {
              type: 'literal',
              value: 'APM',
              isQuoted: true,
            },
          ],
          function: 'is',
          type: 'function',
        },
        perPage: 100,
        type: 'alert',
        namespaces: ['default'],
      });
    });

    test('should call bulkMarkApiKeysForInvalidation with keys apiKeys to invalidate', async () => {
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

    test('should call bulkMarkApiKeysForInvalidation to invalidate unused keys if bulkCreate failed', async () => {
      createAPIKeyMock.mockReturnValue({ apiKeysEnabled: true, result: { api_key: '111' } });
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: { ...existingDecryptedRule.attributes, enabled: true },
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockImplementation(() => {
        throw new Error('Fail');
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
      ).rejects.toThrow('Fail');

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledTimes(1);
      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['dW5kZWZpbmVkOjExMQ=='] },
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should call bulkMarkApiKeysForInvalidation to invalidate unused keys if SO update failed', async () => {
      createAPIKeyMock.mockReturnValue({ apiKeysEnabled: true, result: { api_key: '111' } });
      mockCreatePointInTimeFinderAsInternalUser({
        saved_objects: [
          {
            ...existingDecryptedRule,
            attributes: { ...existingDecryptedRule.attributes, enabled: true },
          },
        ],
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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
            error: {
              error: 'test failure',
              statusCode: 500,
              message: 'test failure',
            },
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

      expect(bulkMarkApiKeysForInvalidation).toHaveBeenCalledWith(
        { apiKeys: ['dW5kZWZpbmVkOjExMQ=='] },
        expect.any(Object),
        expect.any(Object)
      );
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
            ...existingDecryptedRule,
            attributes: { ...existingDecryptedRule.attributes, enabled: true },
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
      expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/my rule name');
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
      expect(result.errors[0]).toHaveProperty('rule.name', 'my rule name');
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
            validate: (rule) => rule as RuleTypeParams,
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
      expect(result.errors[0]).toHaveProperty('rule.name', 'my rule name');
    });
  });

  describe('attributes validation', () => {
    test('should not update saved object and return error if SO has interval less than minimum configured one when enforce = true', async () => {
      rulesClient = new RulesClient({
        ...rulesClientParams,
        minimumScheduleInterval: { value: '3m', enforce: true },
      });

      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
        saved_objects: [],
      });

      const result = await rulesClient.bulkEdit({
        filter: '',
        operations: [],
        paramsModifier: async (params) => {
          params.index = ['test-index-*'];

          return params;
        },
      });

      expect(result.errors).toHaveLength(1);
      expect(result.rules).toHaveLength(0);
      expect(result.errors[0].message).toBe(
        'Error updating rule: the interval is less than the allowed minimum interval of 3m'
      );
    });
  });

  describe('paramsModifier', () => {
    test('should update index pattern params', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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

      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            id: '1',
            type: 'alert',
            attributes: expect.objectContaining({
              params: expect.objectContaining({
                index: ['test-index-*'],
              }),
            }),
          }),
        ],
        { overwrite: true }
      );
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

  describe('task manager', () => {
    test('should call task manager method bulkCreateSchedules if operation set new schedules', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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

      await rulesClient.bulkEdit({
        operations: [
          {
            field: 'schedule',
            operation: 'set',
            value: { interval: '10m' },
          },
        ],
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith(['task-123'], {
        interval: '10m',
      });
    });

    test('should not call task manager method bulkCreateSchedules if operation is not set schedule', async () => {
      unsecuredSavedObjectsClient.bulkCreate.mockResolvedValue({
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

      await rulesClient.bulkEdit({
        operations: [
          {
            field: 'tags',
            operation: 'set',
            value: ['test-tag'],
          },
        ],
      });

      expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
    });
  });
});

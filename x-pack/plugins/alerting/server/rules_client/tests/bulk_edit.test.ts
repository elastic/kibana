/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '../../../../../../src/core/server/mocks';
import { taskManagerMock } from '../../../../task_manager/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { IntervalSchedule, InvalidatePendingApiKey } from '../../types';
import { RecoveredActionGroup } from '../../../common';
import { encryptedSavedObjectsMock } from '../../../../encrypted_saved_objects/server/mocks';
import { actionsAuthorizationMock } from '../../../../actions/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { resolvable } from '../../test_utils';
import { ActionsAuthorization, ActionsClient } from '../../../../actions/server';
import { TaskStatus } from '../../../../task_manager/server';
import { auditLoggerMock } from '../../../../security/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';

jest.mock('../../../../../../src/core/server/saved_objects/service/lib/utils', () => ({
  SavedObjectsUtils: {
    generateId: () => 'mock-saved-object-id',
  },
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
      enabled: true,
      tags: ['foo'],
      alertTypeId: 'myType',
      schedule: { interval: '1m' },
      consumer: 'myApp',
      scheduledTaskId: 'task-123',
      params: {},
      throttle: null,
      notifyWhen: null,
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

  beforeEach(async () => {
    rulesClient = new RulesClient(rulesClientParams);
    actionsClient = (await rulesClientParams.getActionsClient()) as jest.Mocked<ActionsClient>;
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValue([
      {
        id: '1',
        actionTypeId: 'test',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'email connector',
        isPreconfigured: false,
      },
    ]);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    encryptedSavedObjects.createPointInTimeFinderAsInternalUser = jest.fn().mockResolvedValue({
      close: jest.fn(),
      find: function* asyncGenerator() {
        yield { saved_objects: [{ id: '1' }, { id: '2' }] };
      },
    });

    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(existingDecryptedAlert);
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
  describe('tags actions', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
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

      encryptedSavedObjects.createPointInTimeFinderAsInternalUser = jest.fn().mockResolvedValue({
        close: jest.fn(),
        find: function* asyncGenerator() {
          yield {
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
                  params: {},
                  throttle: null,
                  notifyWhen: null,
                  actions: [],
                },
                references: [],
                version: '123',
              },
            ],
          };
        },
      });
    });
    test('adds new tag', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
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
        actions: [
          {
            field: 'tags',
            action: 'add',
            value: ['test-1'],
          },
        ],
      });

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('tags', ['foo', 'test-1']);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        {
          id: '1',
          attributes: expect.objectContaining({
            tags: ['foo', 'test-1'],
          }),
          references: [],
          type: 'alert',
          version: '123',
        },
      ]);
    });

    test('delete tag', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
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
        actions: [
          {
            field: 'tags',
            action: 'delete',
            value: ['foo'],
          },
        ],
      });

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('tags', []);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        {
          id: '1',
          attributes: expect.objectContaining({
            tags: [],
          }),
          references: [],
          type: 'alert',
          version: '123',
        },
      ]);
    });

    test('set tags', async () => {
      unsecuredSavedObjectsClient.bulkUpdate.mockResolvedValueOnce({
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
        actions: [
          {
            field: 'tags',
            action: 'set',
            value: ['test-1', 'test-2'],
          },
        ],
      });

      expect(result.errors).toHaveLength(0);
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0]).toHaveProperty('tags', ['test-1', 'test-2']);

      expect(unsecuredSavedObjectsClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0]).toHaveLength(1);
      expect(unsecuredSavedObjectsClient.bulkUpdate.mock.calls[0][0]).toEqual([
        {
          id: '1',
          attributes: expect.objectContaining({
            tags: ['test-1', 'test-2'],
          }),
          references: [],
          type: 'alert',
          version: '123',
        },
      ]);
    });
  });

  // describe('rules', () => {
  //   test('aggregates rules by alertTypeId and consumer', async () => {});

  //   test('throws if ruleType is not enabled', async () => {});

  //   test('throws if ruleType is not authorized', async () => {});
  // });

  describe('ruleTypes aggregation and validation', () => {
    test('aggregates rules by alertTypeId and consumer', async () => {});

    test('throws if number of matched rules greater than 10_000', async () => {});

    test('throws aggregations result is empty', async () => {});

    test('throws if ruleType is not enabled', async () => {});

    test('throws if ruleType is not authorized', async () => {});
  });

  describe('apiKeys', () => {
    test('encrypted createPointInTimeFinderAsInternalUser returns api Keys', async () => {});

    test('should not call bulkApiKeys invalidate if all rules disabled', async () => {});

    test('should call bulkApiKeys invalidate if at least one rule enabled', async () => {});

    test('should return error in rule errors if key is not generated', async () => {});
  });

  describe('params validation', () => {
    test('should validate params for rules', async () => {});

    test('should validate mutatedParams for rules', async () => {});
  });

  describe('paramsModifier', () => {
    test('should update index pattern params', async () => {});
  });
});

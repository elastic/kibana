/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { IntervalSchedule, RuleNotifyWhen } from '../../types';
import { RecoveredActionGroup } from '../../../common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization, ActionsClient } from '@kbn/actions-plugin/server';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';

jest.mock('@kbn/core-saved-objects-utils-server', () => {
  const actual = jest.requireActual('@kbn/core-saved-objects-utils-server');
  return {
    ...actual,
    SavedObjectsUtils: {
      generateId: () => 'mock-saved-object-id',
    },
  };
});

jest.mock('../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation', () => ({
  bulkMarkApiKeysForInvalidation: jest.fn(),
}));

const bulkMarkApiKeysForInvalidationMock = bulkMarkApiKeysForInvalidation as jest.Mock;
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

describe('update()', () => {
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
      actions: [
        {
          group: 'default',
          id: '1',
          actionTypeId: '1',
          actionRef: '1',
          params: {
            foo: true,
          },
          frequency: {
            summary: false,
            notifyWhen: RuleNotifyWhen.CHANGE,
            throttle: null,
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
        isDeprecated: false,
      },
    ]);
    rulesClientParams.getActionsClient.mockResolvedValue(actionsClient);
    unsecuredSavedObjectsClient.get.mockResolvedValue(existingAlert);
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
      async executor() {
        return { state: {} };
      },
      producer: 'alerts',
    });
  });

  test('updates given parameters', async () => {
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
        isDeprecated: false,
      },
      {
        id: '2',
        actionTypeId: 'test2',
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
        isDeprecated: false,
      },
    ]);
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    const result = await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
          risk_score: 40,
          severity: 'low',
        },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test2",
            "group": "default",
            "id": "2",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": true,
        "id": "1",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidationMock).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toHaveLength(3);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionRef": "action_1",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionRef": "action_2",
            "actionTypeId": "test2",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "myType",
        "apiKey": null,
        "apiKeyOwner": null,
        "consumer": "myApp",
        "enabled": true,
        "mapped_params": Object {
          "risk_score": 40,
          "severity": "20-low",
        },
        "meta": Object {
          "versionApiKeyLastmodified": "v7.10.0",
        },
        "name": "abc",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": true,
          "risk_score": 40,
          "severity": "low",
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "throttle": null,
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "overwrite": true,
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
          Object {
            "id": "1",
            "name": "action_1",
            "type": "action",
          },
          Object {
            "id": "2",
            "name": "action_2",
            "type": "action",
          },
        ],
        "version": "123",
      }
    `);
    expect(actionsClient.isActionTypeEnabled).toHaveBeenCalledWith('test', { notifyUsage: true });
    expect(actionsClient.isActionTypeEnabled).toHaveBeenCalledWith('test2', { notifyUsage: true });
  });

  test('should update a rule with some preconfigured actions', async () => {
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
        isDeprecated: false,
      },
      {
        id: '2',
        actionTypeId: 'test2',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: false,
        name: 'another email connector',
        isPreconfigured: false,
        isDeprecated: false,
      },
      {
        id: 'preconfigured',
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
        name: 'preconfigured email connector',
        isPreconfigured: true,
        isDeprecated: false,
      },
    ]);
    actionsClient.isPreconfigured.mockReset();
    actionsClient.isPreconfigured.mockReturnValueOnce(false);
    actionsClient.isPreconfigured.mockReturnValueOnce(true);
    actionsClient.isPreconfigured.mockReturnValueOnce(true);
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'preconfigured:preconfigured',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'custom',
            actionRef: 'preconfigured:preconfigured',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'param:soRef_0',
          type: 'someSavedObjectType',
          id: '9',
        },
      ],
    });
    const result = await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: 'preconfigured',
            params: {
              foo: true,
            },
          },
          {
            group: 'custom',
            id: 'preconfigured',
            params: {
              foo: true,
            },
          },
        ],
      },
    });

    expect(unsecuredSavedObjectsClient.create).toHaveBeenNthCalledWith(
      1,
      'alert',
      {
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'preconfigured:preconfigured',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'custom',
            actionRef: 'preconfigured:preconfigured',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        alertTypeId: 'myType',
        apiKey: null,
        apiKeyOwner: null,
        consumer: 'myApp',
        enabled: true,
        meta: { versionApiKeyLastmodified: 'v7.10.0' },
        name: 'abc',
        notifyWhen: 'onActiveAlert',
        params: { bar: true },
        schedule: { interval: '1m' },
        scheduledTaskId: 'task-123',
        tags: ['foo'],
        throttle: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        id: '1',
        overwrite: true,
        references: [{ id: '1', name: 'action_0', type: 'action' }],
        version: '123',
      }
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "preconfigured",
            "params": Object {
              "foo": true,
            },
          },
          Object {
            "actionTypeId": "test",
            "group": "custom",
            "id": "preconfigured",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": true,
        "id": "1",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(encryptedSavedObjects.getDecryptedAsInternalUser).toHaveBeenCalledWith('alert', '1', {
      namespace: 'default',
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
    expect(actionsClient.isPreconfigured).toHaveBeenCalledTimes(3);
  });

  test('should call useSavedObjectReferences.extractReferences and useSavedObjectReferences.injectReferences if defined for rule type', async () => {
    const ruleParams = {
      bar: true,
      parameterThatIsSavedObjectId: '9',
    };
    const extractReferencesFn = jest.fn().mockReturnValue({
      params: {
        bar: true,
        parameterThatIsSavedObjectRef: 'soRef_0',
      },
      references: [
        {
          name: 'soRef_0',
          type: 'someSavedObjectType',
          id: '9',
        },
      ],
    });
    const injectReferencesFn = jest.fn().mockReturnValue({
      bar: true,
      parameterThatIsSavedObjectId: '9',
    });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: 'myType',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        return { state: {} };
      },
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: extractReferencesFn,
        injectReferences: injectReferencesFn,
      },
    }));
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
          parameterThatIsSavedObjectRef: 'soRef_0',
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'param:soRef_0',
          type: 'someSavedObjectType',
          id: '9',
        },
      ],
    });
    const result = await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: ruleParams,
        throttle: null,
        notifyWhen: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });

    expect(extractReferencesFn).toHaveBeenCalledWith(ruleParams);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      'alert',
      {
        actions: [
          { actionRef: 'action_0', actionTypeId: 'test', group: 'default', params: { foo: true } },
        ],
        alertTypeId: 'myType',
        apiKey: null,
        apiKeyOwner: null,
        consumer: 'myApp',
        enabled: true,
        meta: { versionApiKeyLastmodified: 'v7.10.0' },
        name: 'abc',
        notifyWhen: 'onActiveAlert',
        params: { bar: true, parameterThatIsSavedObjectRef: 'soRef_0' },
        schedule: { interval: '1m' },
        scheduledTaskId: 'task-123',
        tags: ['foo'],
        throttle: null,
        updatedAt: '2019-02-12T21:01:22.479Z',
        updatedBy: 'elastic',
      },
      {
        id: '1',
        overwrite: true,
        references: [
          { id: '1', name: 'action_0', type: 'action' },
          { id: '9', name: 'param:soRef_0', type: 'someSavedObjectType' },
        ],
        version: '123',
      }
    );

    expect(injectReferencesFn).toHaveBeenCalledWith(
      {
        bar: true,
        parameterThatIsSavedObjectRef: 'soRef_0',
      },
      [{ id: '9', name: 'soRef_0', type: 'someSavedObjectType' }]
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": true,
        "id": "1",
        "notifyWhen": "onActiveAlert",
        "params": Object {
          "bar": true,
          "parameterThatIsSavedObjectId": "9",
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
  });

  it('calls the createApiKey function', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '123', name: '123', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notifyWhen: 'onThrottleInterval',
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        apiKey: Buffer.from('123:abc').toString('base64'),
        scheduledTaskId: 'task-123',
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: '5m',
        notifyWhen: 'onThrottleInterval',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "apiKey": "MTIzOmFiYw==",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": true,
        "id": "1",
        "notifyWhen": "onThrottleInterval",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidationMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidationMock).toHaveBeenCalledWith(
      {
        apiKeys: ['MTIzOmFiYw=='],
      },
      expect.any(Object),
      expect.any(Object)
    );
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toHaveLength(3);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "myType",
        "apiKey": "MTIzOmFiYw==",
        "apiKeyOwner": "elastic",
        "consumer": "myApp",
        "enabled": true,
        "meta": Object {
          "versionApiKeyLastmodified": "v7.10.0",
        },
        "name": "abc",
        "notifyWhen": "onThrottleInterval",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "throttle": "5m",
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "overwrite": true,
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
        ],
        "version": "123",
      }
    `);
  });

  it(`doesn't call the createAPIKey function when alert is disabled`, async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue({
      ...existingDecryptedAlert,
      attributes: {
        ...existingDecryptedAlert.attributes,
        enabled: false,
      },
    });
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        notifyWhen: 'onThrottleInterval',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        apiKey: null,
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    const result = await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: '5m',
        notifyWhen: 'onThrottleInterval',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(rulesClientParams.createAPIKey).not.toHaveBeenCalled();
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": "test",
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "apiKey": null,
        "createdAt": 2019-02-12T21:01:22.479Z,
        "enabled": false,
        "id": "1",
        "notifyWhen": "onThrottleInterval",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0]).toHaveLength(3);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][0]).toEqual('alert');
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][1]).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test",
            "group": "default",
            "params": Object {
              "foo": true,
            },
          },
        ],
        "alertTypeId": "myType",
        "apiKey": null,
        "apiKeyOwner": null,
        "consumer": "myApp",
        "enabled": false,
        "meta": Object {
          "versionApiKeyLastmodified": "v7.10.0",
        },
        "name": "abc",
        "notifyWhen": "onThrottleInterval",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "1m",
        },
        "scheduledTaskId": "task-123",
        "tags": Array [
          "foo",
        ],
        "throttle": "5m",
        "updatedAt": "2019-02-12T21:01:22.479Z",
        "updatedBy": "elastic",
      }
    `);
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "overwrite": true,
        "references": Array [
          Object {
            "id": "1",
            "name": "action_0",
            "type": "action",
          },
        ],
        "version": "123",
      }
    `);
  });

  it('throws an error if API key creation throws', async () => {
    rulesClientParams.createAPIKey.mockImplementation(() => {
      throw new Error('no');
    });
    expect(
      async () =>
        await rulesClient.update({
          id: '1',
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            throttle: null,
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'default',
                id: '1',
                params: {
                  foo: true,
                },
              },
              {
                group: 'default',
                id: '1',
                params: {
                  foo: true,
                },
              },
              {
                group: 'default',
                id: '2',
                params: {
                  foo: true,
                },
              },
            ],
          },
        })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error updating rule: could not create API key - no"`
    );
  });

  it('should validate params', async () => {
    ruleTypeRegistry.get.mockReturnValueOnce({
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
      async executor() {
        return { state: {} };
      },
      producer: 'alerts',
    });
    await expect(
      rulesClient.update({
        id: '1',
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          notifyWhen: null,
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
          ],
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"params invalid: [param1]: expected value of type [string] but got [undefined]"`
    );
  });

  it('should trim alert name in the API key name', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: false,
        name: ' my alert name ',
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onActionGroupChange',
              throttle: null,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        apiKey: null,
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    await rulesClient.update({
      id: '1',
      data: {
        ...existingAlert.attributes,
        name: ' my alert name ',
      },
    });

    expect(rulesClientParams.createAPIKey).toHaveBeenCalledWith('Alerting: myType/my alert name');
  });

  it('swallows error when invalidate API key throws', async () => {
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onActionGroupChange',
              throttle: null,
            },
          },
        ],
        scheduledTaskId: 'task-123',
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    });
    bulkMarkApiKeysForInvalidationMock.mockImplementationOnce(() => new Error('Fail'));
    await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onActionGroupChange',
              throttle: null,
            },
          },
        ],
      },
    });
    expect(bulkMarkApiKeysForInvalidationMock).toHaveBeenCalledWith(
      {
        apiKeys: ['MTIzOmFiYw=='],
      },
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('swallows error when getDecryptedAsInternalUser throws', async () => {
    encryptedSavedObjects.getDecryptedAsInternalUser.mockRejectedValue(new Error('Fail'));
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
        isDeprecated: false,
      },
      {
        id: '2',
        actionTypeId: 'test2',
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
        isDeprecated: false,
      },
    ]);
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onActionGroupChange',
              throttle: null,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onActionGroupChange',
              throttle: null,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onActionGroupChange',
              throttle: null,
            },
          },
        ],
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1m' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onThrottleInterval',
              throttle: '5m',
            },
          },
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onThrottleInterval',
              throttle: '5m',
            },
          },
          {
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
            frequency: {
              summary: false,
              notifyWhen: 'onThrottleInterval',
              throttle: '5m',
            },
          },
        ],
      },
    });
    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith('alert', '1');
    expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
      'update(): Failed to load API key to invalidate on alert 1: Fail'
    );
  });

  test('throws when unsecuredSavedObjectsClient update fails and invalidates newly created API key', async () => {
    rulesClientParams.createAPIKey.mockResolvedValueOnce({
      apiKeysEnabled: true,
      result: { id: '234', name: '234', api_key: 'abc' },
    });
    unsecuredSavedObjectsClient.create.mockRejectedValue(new Error('Fail'));
    await expect(
      rulesClient.update({
        id: '1',
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
              frequency: {
                summary: false,
                notifyWhen: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    expect(bulkMarkApiKeysForInvalidationMock).toHaveBeenCalledTimes(1);
    expect(bulkMarkApiKeysForInvalidationMock).toHaveBeenCalledWith(
      {
        apiKeys: ['MjM0OmFiYw=='],
      },
      expect.any(Object),
      expect.any(Object)
    );
  });

  describe('updating an alert schedule', () => {
    function mockApiCalls(
      alertId: string,
      taskId: string,
      currentSchedule: IntervalSchedule,
      updatedSchedule: IntervalSchedule
    ) {
      // mock return values from deps
      ruleTypeRegistry.get.mockReturnValueOnce({
        id: '123',
        name: 'Test',
        actionGroups: [
          { id: 'default', name: 'Default' },
          { id: 'group2', name: 'Action Group 2' },
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
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValueOnce({
        id: alertId,
        type: 'alert',
        attributes: {
          actions: [],
          enabled: true,
          alertTypeId: '123',
          schedule: currentSchedule,
          scheduledTaskId: 'task-123',
        },
        references: [],
        version: '123',
      });

      taskManager.schedule.mockResolvedValueOnce({
        id: taskId,
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
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: alertId,
        type: 'alert',
        attributes: {
          enabled: true,
          schedule: updatedSchedule,
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              actionTypeId: 'test',
              params: {
                foo: true,
              },
              frequency: {
                summary: false,
                notifyWhen: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
          scheduledTaskId: taskId,
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: alertId,
          },
        ],
      });

      taskManager.runSoon.mockReturnValueOnce(Promise.resolve({ id: alertId }));
    }

    test('updating the alert schedule should call taskManager.bulkUpdateSchedules', async () => {
      const alertId = uuidv4();
      const taskId = uuidv4();

      mockApiCalls(alertId, taskId, { interval: '60m' }, { interval: '1m' });

      await rulesClient.update({
        id: alertId,
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
              frequency: {
                summary: false,
                notifyWhen: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
        },
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalledWith([taskId], { interval: '1m' });
    });

    test('updating the alert without changing the schedule should not call taskManager.bulkUpdateSchedules', async () => {
      const alertId = uuidv4();
      const taskId = uuidv4();

      mockApiCalls(alertId, taskId, { interval: '1m' }, { interval: '1m' });

      await rulesClient.update({
        id: alertId,
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
              frequency: {
                summary: false,
                notifyWhen: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
        },
      });

      expect(taskManager.bulkUpdateSchedules).not.toHaveBeenCalled();
    });

    test('throws error when mixing and matching global and per-action frequency values', async () => {
      const alertId = uuidv4();
      const taskId = uuidv4();

      mockApiCalls(alertId, taskId, { interval: '1m' }, { interval: '1m' });
      await expect(
        rulesClient.update({
          id: alertId,
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            throttle: null,
            notifyWhen: 'onActionGroupChange',
            actions: [
              {
                group: 'default',
                id: '1',
                params: {
                  foo: true,
                },
                frequency: {
                  summary: false,
                  notifyWhen: 'onActionGroupChange',
                  throttle: null,
                },
              },
              {
                group: 'group2',
                id: '2',
                params: {
                  foo: true,
                },
                frequency: {
                  summary: false,
                  notifyWhen: 'onActionGroupChange',
                  throttle: null,
                },
              },
            ],
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot specify per-action frequency params when notify_when or throttle are defined at the rule level: default, group2"`
      );
      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();

      await expect(
        rulesClient.update({
          id: alertId,
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            throttle: null,
            notifyWhen: null,
            actions: [
              {
                group: 'default',
                id: '1',
                params: {
                  foo: true,
                },
                frequency: {
                  summary: false,
                  notifyWhen: 'onActionGroupChange',
                  throttle: null,
                },
              },
              {
                group: 'default',
                id: '2',
                params: {
                  foo: true,
                },
              },
            ],
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Cannot specify per-action frequency params when notify_when or throttle are defined at the rule level: default"`
      );
      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    test('throws error when neither global frequency nor action frequency are defined', async () => {
      const alertId = uuidv4();
      const taskId = uuidv4();

      mockApiCalls(alertId, taskId, { interval: '1m' }, { interval: '1m' });

      await expect(
        rulesClient.update({
          id: alertId,
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            notifyWhen: undefined,
            throttle: undefined,
            actions: [
              {
                group: 'default',
                id: '1',
                params: {
                  foo: true,
                },
              },
            ],
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Actions missing frequency parameters: default"`
      );
      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    test('throws error when when some actions are missing frequency params', async () => {
      const alertId = uuidv4();
      const taskId = uuidv4();

      mockApiCalls(alertId, taskId, { interval: '1m' }, { interval: '1m' });

      await expect(
        rulesClient.update({
          id: alertId,
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            notifyWhen: undefined,
            throttle: undefined,
            actions: [
              {
                group: 'default',
                id: '1',
                params: {
                  foo: true,
                },
                frequency: {
                  summary: false,
                  notifyWhen: 'onActionGroupChange',
                  throttle: null,
                },
              },
              {
                group: 'default',
                id: '2',
                params: {
                  foo: true,
                },
              },
            ],
          },
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Actions missing frequency parameters: default"`
      );
      expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
      expect(taskManager.schedule).not.toHaveBeenCalled();
    });

    test('logs when update of schedule of an alerts underlying task fails', async () => {
      const alertId = uuidv4();
      const taskId = uuidv4();

      mockApiCalls(alertId, taskId, { interval: '1m' }, { interval: '30s' });

      taskManager.bulkUpdateSchedules.mockReset();
      taskManager.bulkUpdateSchedules.mockRejectedValue(new Error('Failed to run alert'));

      await rulesClient.update({
        id: alertId,
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
              frequency: {
                summary: false,
                notifyWhen: 'onActionGroupChange',
                throttle: null,
              },
            },
          ],
        },
      });

      expect(taskManager.bulkUpdateSchedules).toHaveBeenCalled();

      expect(rulesClientParams.logger.error).toHaveBeenCalledWith(
        `Rule update failed to run its underlying task. TaskManager bulkUpdateSchedules failed with Error: Failed to run alert`
      );
    });
  });

  test('throws error when updating action using connector with missing secrets', async () => {
    // Reset from default behaviour
    actionsClient.getBulk.mockReset();
    actionsClient.getBulk.mockResolvedValueOnce([
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
        isDeprecated: false,
      },
      {
        id: '2',
        actionTypeId: 'tes2',
        config: {
          from: 'me@me.com',
          hasAuth: false,
          host: 'hello',
          port: 22,
          secure: null,
          service: null,
        },
        isMissingSecrets: true,
        name: 'another connector',
        isPreconfigured: false,
        isDeprecated: false,
      },
    ]);

    await expect(
      rulesClient.update({
        id: '1',
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          notifyWhen: 'onActiveAlert',
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
            {
              group: 'default',
              id: '2',
              params: {
                foo: true,
              },
            },
          ],
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Invalid connectors: another connector"`);
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  test('logs warning when creating with an interval less than the minimum configured one when enforce = false', async () => {
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
        isDeprecated: false,
      },
      {
        id: '2',
        actionTypeId: 'test2',
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
        isDeprecated: false,
      },
    ]);
    unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
        schedule: { interval: '1m' },
        params: {
          bar: true,
        },
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_1',
            actionTypeId: 'test',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            actionRef: 'action_2',
            actionTypeId: 'test2',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
        scheduledTaskId: 'task-123',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_1',
          type: 'action',
          id: '1',
        },
        {
          name: 'action_2',
          type: 'action',
          id: '2',
        },
      ],
    });
    await rulesClient.update({
      id: '1',
      data: {
        schedule: { interval: '1s' },
        name: 'abc',
        tags: ['foo'],
        params: {
          bar: true,
        },
        throttle: null,
        notifyWhen: 'onActiveAlert',
        actions: [
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '1',
            params: {
              foo: true,
            },
          },
          {
            group: 'default',
            id: '2',
            params: {
              foo: true,
            },
          },
        ],
      },
    });
    expect(rulesClientParams.logger.warn).toHaveBeenCalledWith(
      `Rule schedule interval (1s) for "myType" rule type with ID "1" is less than the minimum value (1m). Running rules at this interval may impact alerting performance. Set "xpack.alerting.rules.minimumScheduleInterval.enforce" to true to prevent such changes.`
    );
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalled();
  });

  test('throws error when updating with an interval less than the minimum configured one when enforce = true', async () => {
    rulesClient = new RulesClient({
      ...rulesClientParams,
      minimumScheduleInterval: { value: '1m', enforce: true },
    });
    await expect(
      rulesClient.update({
        id: '1',
        data: {
          schedule: { interval: '1s' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          notifyWhen: 'onActiveAlert',
          actions: [
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
            {
              group: 'default',
              id: '1',
              params: {
                foo: true,
              },
            },
            {
              group: 'default',
              id: '2',
              params: {
                foo: true,
              },
            },
          ],
        },
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error updating rule: the interval is less than the allowed minimum interval of 1m"`
    );
    expect(unsecuredSavedObjectsClient.create).not.toHaveBeenCalled();
    expect(taskManager.schedule).not.toHaveBeenCalled();
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          alertTypeId: 'myType',
          consumer: 'myApp',
          enabled: true,
          schedule: { interval: '1m' },
          params: {
            bar: true,
          },
          actions: [],
          scheduledTaskId: 'task-123',
          createdAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        references: [],
      });
    });

    test('ensures user is authorised to update this type of alert under the consumer', async () => {
      await rulesClient.update({
        id: '1',
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          notifyWhen: null,
          actions: [],
        },
      });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'update',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to update this type of alert', async () => {
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to update a "myType" alert for "myApp"`)
      );

      await expect(
        rulesClient.update({
          id: '1',
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            throttle: null,
            notifyWhen: null,
            actions: [],
          },
        })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to update a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'update',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.create.mockResolvedValueOnce({
        id: '1',
        type: 'alert',
        attributes: {
          enabled: true,
          schedule: { interval: '1m' },
          params: {
            bar: true,
          },
          actions: [],
          scheduledTaskId: 'task-123',
          createdAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
        references: [],
      });
    });

    test('logs audit event when updating a rule', async () => {
      await rulesClient.update({
        id: '1',
        data: {
          schedule: { interval: '1m' },
          name: 'abc',
          tags: ['foo'],
          params: {
            bar: true,
          },
          throttle: null,
          actions: [],
          notifyWhen: null,
        },
      });

      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_update',
            outcome: 'unknown',
          }),
          kibana: { saved_object: { id: '1', type: 'alert' } },
        })
      );
    });

    test('logs audit event when not authorised to update a rule', async () => {
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        rulesClient.update({
          id: '1',
          data: {
            schedule: { interval: '1m' },
            name: 'abc',
            tags: ['foo'],
            params: {
              bar: true,
            },
            throttle: null,
            actions: [],
            notifyWhen: null,
          },
        })
      ).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            outcome: 'failure',
            action: 'rule_update',
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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { getBeforeSetup } from '../../../../rules_client/tests/lib';
import { RuleDomain } from '../../types';
import { ConstructorOptions, RulesClient } from '../../../../rules_client/rules_client';

describe('clone', () => {
  const taskManager = taskManagerMock.createStart();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
  const authorization = alertingAuthorizationMock.create();
  const actionsAuthorization = actionsAuthorizationMock.create();
  const auditLogger = auditLoggerMock.create();
  const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

  const kibanaVersion = 'v8.2.0';
  const createAPIKeyMock = jest.fn();
  const isAuthenticationTypeApiKeyMock = jest.fn();
  const getAuthenticationApiKeyMock = jest.fn();

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
    internalSavedObjectsRepository,
    encryptedSavedObjectsClient: encryptedSavedObjects,
    getActionsClient: jest.fn(),
    getEventLogClient: jest.fn(),
    kibanaVersion,
    auditLogger,
    maxScheduledPerMinute: 10000,
    minimumScheduleInterval: { value: '1m', enforce: false },
    isAuthenticationTypeAPIKey: isAuthenticationTypeApiKeyMock,
    getAuthenticationAPIKey: getAuthenticationApiKeyMock,
    connectorAdapterRegistry: new ConnectorAdapterRegistry(),
    isSystemAction: jest.fn(),
    getAlertIndicesAlias: jest.fn(),
    alertsService: null,
    uiSettings: uiSettingsServiceMock.createStartContract(),
  };

  let rulesClient: RulesClient;

  beforeEach(() => {
    jest.clearAllMocks();
    getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
    rulesClient = new RulesClient(rulesClientParams);
  });

  describe('actions', () => {
    const rule = {
      id: 'test-rule',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        name: 'My rule',
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            frequency: {
              notifyWhen: 'onActiveAlert' as const,
              summary: false,
              throttle: null,
            },
            group: 'default',
            params: {},
            actionRef: 'action_0',
            actionTypeId: 'test-1',
            uuid: '222',
          },
          {
            params: {},
            actionRef: 'system_action:system_action-id',
            actionTypeId: 'test-2',
            uuid: '222',
          },
        ],
        notifyWhen: 'onActiveAlert',
        executionStatus: {},
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    };

    it('transform actions correctly', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(rule);
      unsecuredSavedObjectsClient.create.mockResolvedValue(rule);

      const res = await rulesClient.clone({
        id: 'test-rule',
        newId: 'test-rule-2',
      });

      expect(res.actions).toEqual([
        {
          actionTypeId: 'test-1',
          frequency: { notifyWhen: 'onActiveAlert', summary: false, throttle: null },
          group: 'default',
          id: '1',
          params: {},
          uuid: '222',
        },
      ]);

      expect(res.systemActions).toEqual([
        { actionTypeId: 'test-2', id: 'system_action-id', params: {}, uuid: '222' },
      ]);
    });

    it('clones the actions correctly', async () => {
      encryptedSavedObjects.getDecryptedAsInternalUser.mockResolvedValue(rule);
      unsecuredSavedObjectsClient.create.mockResolvedValue(rule);

      await rulesClient.clone({
        id: 'test-rule',
        newId: 'test-rule-2',
      });
      const results = unsecuredSavedObjectsClient.create.mock.calls[0][1] as RuleDomain;

      expect(results.actions).toMatchInlineSnapshot(`
        Array [
          Object {
            "actionRef": "action_0",
            "actionTypeId": "test-1",
            "frequency": Object {
              "notifyWhen": "onActiveAlert",
              "summary": false,
              "throttle": null,
            },
            "group": "default",
            "params": Object {},
            "uuid": "222",
          },
          Object {
            "actionRef": "system_action:system_action-id",
            "actionTypeId": "test-2",
            "params": Object {},
            "uuid": "222",
          },
        ]
      `);
    });
  });
});

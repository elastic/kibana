/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';

import { RulesClient, ConstructorOptions } from '../rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../authorization/alerting_authorization.mock';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from './lib';
import { RecoveredActionGroup } from '../../../common';
import { formatLegacyActions } from '../lib';
import { ConnectorAdapterRegistry } from '../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

jest.mock('../lib/siem_legacy_actions/format_legacy_actions', () => {
  return {
    formatLegacyActions: jest.fn(),
  };
});

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
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('resolve()', () => {
  test('calls saved objects client with given params', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
      saved_object: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
          notifyWhen: 'onActiveAlert',
          executionStatus: {
            status: 'ok',
            last_execution_date: new Date().toISOString(),
            last_duration: 10,
          },
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      },
      outcome: 'aliasMatch',
      alias_target_id: '2',
    });
    const result = await rulesClient.resolve({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": undefined,
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
            "uuid": undefined,
          },
        ],
        "alertTypeId": "123",
        "alias_target_id": "2",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "executionStatus": Object {
          "lastExecutionDate": 2019-02-12T21:01:22.479Z,
          "status": "ok",
        },
        "id": "1",
        "notifyWhen": "onActiveAlert",
        "outcome": "aliasMatch",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "snoozeSchedule": Array [],
        "systemActions": Array [],
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
    expect(unsecuredSavedObjectsClient.resolve).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.resolve.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alert",
        "1",
        undefined,
      ]
    `);
  });

  test('calls saved objects client with id and includeSnoozeData params', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
      saved_object: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          legacyId: 'some-legacy-id',
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snoozeSchedule: [
            {
              duration: 10000,
              rRule: {
                dtstart: new Date().toISOString(),
                tzid: 'UTC',
                count: 1,
              },
            },
          ],
          muteAll: false,
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
          notifyWhen: 'onActiveAlert',
          executionStatus: {
            status: 'ok',
            last_execution_date: new Date().toISOString(),
            last_duration: 10,
          },
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      },
      outcome: 'aliasMatch',
      alias_target_id: '2',
    });
    const result = await rulesClient.resolve({ id: '1', includeSnoozeData: true });
    expect(result.isSnoozedUntil).toBeTruthy();
  });

  test('should call useSavedObjectReferences.injectReferences if defined for rule type', async () => {
    const injectReferencesFn = jest.fn().mockReturnValue({
      bar: true,
      parameterThatIsSavedObjectId: '9',
    });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: jest.fn(),
        injectReferences: injectReferencesFn,
      },
      validate: {
        params: { validate: (params) => params },
      },
      validLegacyConsumers: [],
    }));
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
      saved_object: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
            parameterThatIsSavedObjectRef: 'soRef_0',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
          notifyWhen: 'onActiveAlert',
          executionStatus: {
            status: 'ok',
            last_execution_date: new Date().toISOString(),
            last_duration: 10,
          },
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
      },
      outcome: 'aliasMatch',
      alias_target_id: '2',
    });
    const result = await rulesClient.resolve({ id: '1' });

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
            "actionTypeId": undefined,
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
            "uuid": undefined,
          },
        ],
        "alertTypeId": "123",
        "alias_target_id": "2",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "executionStatus": Object {
          "lastExecutionDate": 2019-02-12T21:01:22.479Z,
          "status": "ok",
        },
        "id": "1",
        "notifyWhen": "onActiveAlert",
        "outcome": "aliasMatch",
        "params": Object {
          "bar": true,
          "parameterThatIsSavedObjectId": "9",
        },
        "schedule": Object {
          "interval": "10s",
        },
        "snoozeSchedule": Array [],
        "systemActions": Array [],
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);
  });

  test(`throws an error when references aren't found`, async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
      saved_object: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
          executionStatus: {
            status: 'ok',
            last_execution_date: new Date().toISOString(),
            last_duration: 10,
          },
        },
        references: [],
      },
      outcome: 'aliasMatch',
      alias_target_id: '2',
    });
    await expect(rulesClient.resolve({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Action reference \\"action_0\\" not found in alert id: 1"`
    );
  });

  test('throws an error if useSavedObjectReferences.injectReferences throws an error', async () => {
    const injectReferencesFn = jest.fn().mockImplementation(() => {
      throw new Error('something went wrong!');
    });
    ruleTypeRegistry.get.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'alerts',
      useSavedObjectReferences: {
        extractReferences: jest.fn(),
        injectReferences: injectReferencesFn,
      },
      validate: {
        params: { validate: (params) => params },
      },
      validLegacyConsumers: [],
    }));
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
      saved_object: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
            parameterThatIsSavedObjectRef: 'soRef_0',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
          ],
          notifyWhen: 'onActiveAlert',
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
          {
            name: 'soRef_0',
            type: 'someSavedObjectType',
            id: '9',
          },
        ],
      },
      outcome: 'aliasMatch',
      alias_target_id: '2',
    });
    await expect(rulesClient.resolve({ id: '1' })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error injecting reference into rule params for rule id 1 - something went wrong!"`
    );
  });

  test('resolves a rule with actions using system connectors', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
      saved_object: {
        id: '1',
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: '123',
          schedule: { interval: '10s' },
          params: {
            bar: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          actions: [
            {
              group: 'default',
              actionRef: 'action_0',
              params: {
                foo: true,
              },
            },
            {
              group: 'default',
              actionRef: 'system_action:system_action-id',
              params: {},
            },
          ],
          notifyWhen: 'onActiveAlert',
          executionStatus: {
            status: 'ok',
            last_execution_date: new Date().toISOString(),
            last_duration: 10,
          },
        },
        references: [
          {
            name: 'action_0',
            type: 'action',
            id: '1',
          },
        ],
      },
      outcome: 'aliasMatch',
      alias_target_id: '2',
    });

    const result = await rulesClient.resolve({ id: '1' });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "actions": Array [
          Object {
            "actionTypeId": undefined,
            "group": "default",
            "id": "1",
            "params": Object {
              "foo": true,
            },
            "uuid": undefined,
          },
        ],
        "alertTypeId": "123",
        "alias_target_id": "2",
        "createdAt": 2019-02-12T21:01:22.479Z,
        "executionStatus": Object {
          "lastExecutionDate": 2019-02-12T21:01:22.479Z,
          "status": "ok",
        },
        "id": "1",
        "notifyWhen": "onActiveAlert",
        "outcome": "aliasMatch",
        "params": Object {
          "bar": true,
        },
        "schedule": Object {
          "interval": "10s",
        },
        "snoozeSchedule": Array [],
        "systemActions": Array [
          Object {
            "actionTypeId": undefined,
            "id": "system_action-id",
            "params": Object {},
            "uuid": undefined,
          },
        ],
        "updatedAt": 2019-02-12T21:01:22.479Z,
      }
    `);

    expect(unsecuredSavedObjectsClient.resolve).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.resolve.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "alert",
        "1",
        undefined,
      ]
    `);
  });

  describe('authorization', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
        saved_object: {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: 'myType',
            consumer: 'myApp',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
            executionStatus: {
              status: 'ok',
              last_execution_date: new Date().toISOString(),
              last_duration: 10,
            },
          },
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
        outcome: 'aliasMatch',
        alias_target_id: '2',
      });
    });

    test('ensures user is authorised to resolve this type of rule under the consumer', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.resolve({ id: '1' });

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'get',
        ruleTypeId: 'myType',
      });
    });

    test('throws when user is not authorised to get this type of alert', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.ensureAuthorized.mockRejectedValue(
        new Error(`Unauthorized to get a "myType" alert for "myApp"`)
      );

      await expect(rulesClient.resolve({ id: '1' })).rejects.toMatchInlineSnapshot(
        `[Error: Unauthorized to get a "myType" alert for "myApp"]`
      );

      expect(authorization.ensureAuthorized).toHaveBeenCalledWith({
        entity: 'rule',
        consumer: 'myApp',
        operation: 'get',
        ruleTypeId: 'myType',
      });
    });
  });

  describe('auditLogger', () => {
    beforeEach(() => {
      unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
        saved_object: {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: '123',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            actions: [],
            executionStatus: {
              status: 'ok',
              last_execution_date: new Date().toISOString(),
              last_duration: 10,
            },
          },
          references: [],
        },
        outcome: 'aliasMatch',
        alias_target_id: '2',
      });
    });

    test('logs audit event when getting a rule', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      await rulesClient.resolve({ id: '1' });
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_resolve',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE } },
        })
      );
    });

    test('logs audit event when not authorised to get a rule', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      authorization.ensureAuthorized.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.resolve({ id: '1' })).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_resolve',
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

  describe('legacy actions migration for SIEM', () => {
    const rule = {
      id: '1',
      type: RULE_SAVED_OBJECT_TYPE,
      attributes: {
        alertTypeId: '123',
        schedule: { interval: '10s' },
        params: {
          bar: true,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        actions: [
          {
            group: 'default',
            actionRef: 'action_0',
            params: {
              foo: true,
            },
          },
        ],
        notifyWhen: 'onActiveAlert',
        executionStatus: {
          status: 'ok',
          last_execution_date: new Date().toISOString(),
          last_duration: 10,
        },
      },
      references: [
        {
          name: 'action_0',
          type: 'action',
          id: '1',
        },
      ],
    };

    test('should call formatLegacyActions if consumer is SIEM', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
        saved_object: {
          ...rule,
          attributes: {
            ...rule.attributes,
            consumer: AlertConsumers.SIEM,
          },
        },
        outcome: 'aliasMatch',
        alias_target_id: '2',
      });
      (formatLegacyActions as jest.Mock).mockResolvedValue([
        {
          id: 'migrated_rule_mock',
        },
      ]);

      const result = await rulesClient.resolve({ id: '1' });

      expect(formatLegacyActions).toHaveBeenCalledWith(
        [expect.objectContaining({ id: '1' })],
        expect.any(Object)
      );

      expect(result).toEqual({
        id: 'migrated_rule_mock',
        outcome: 'aliasMatch',
        alias_target_id: '2',
      });
    });

    test('should not call formatLegacyActions if consumer is not SIEM', async () => {
      unsecuredSavedObjectsClient.resolve.mockResolvedValueOnce({
        saved_object: rule,
        outcome: 'aliasMatch',
        alias_target_id: '2',
      });
      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.resolve({ id: '1' });

      expect(formatLegacyActions).not.toHaveBeenCalled();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../../../../rules_client/rules_client';
import {
  savedObjectsClientMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { nodeTypes, fromKueryExpression, toKqlExpression } from '@kbn/es-query';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';
import { RecoveredActionGroup } from '../../../../../common';
import { RegistryRuleType } from '../../../../rule_type_registry';
import { schema } from '@kbn/config-schema';
import {
  enabledRule1,
  enabledRule2,
  siemRule1,
  siemRule2,
} from '../../../../rules_client/tests/test_helpers';
import { formatLegacyActions } from '../../../../rules_client/lib';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';

jest.mock('../../../../rules_client/lib/siem_legacy_actions/format_legacy_actions', () => {
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
  backfillClient: backfillClientMock.create(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn().mockImplementation((id) => id === 'system_action-id'),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

jest.mock('../../../../rules_client/common/map_sort_field', () => ({
  mapSortField: jest.fn(),
}));

describe('find()', () => {
  const listedTypes = new Map<string, RegistryRuleType>([
    [
      'myType',
      {
        actionGroups: [],
        recoveryActionGroup: RecoveredActionGroup,
        actionVariables: undefined,
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        id: 'myType',
        name: 'myType',
        category: 'test',
        producer: 'myApp',
        enabledInLicense: true,
        hasAlertsMappings: false,
        hasFieldsForAAD: false,
        validLegacyConsumers: [],
      },
    ],
  ]);

  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            name: 'fakeRuleName',
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                actionTypeId: 'test-action-id',
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
                uuid: 100,
              },
            ],
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });

    ruleTypeRegistry.list.mockReturnValue(listedTypes);
    authorization.getAuthorizedRuleTypes.mockResolvedValue(
      new Map([
        [
          'myType',
          {
            authorizedConsumers: {
              myApp: { read: true, all: true },
            },
          },
        ],
      ])
    );
  });

  test('calls saved objects client with given params', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.find({ options: {} });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
          Object {
            "actions": Array [
              Object {
                "actionTypeId": "test-action-id",
                "group": "default",
                "id": "1",
                "params": Object {
                  "foo": true,
                },
                "uuid": 100,
              },
            ],
            "alertTypeId": "myType",
            "createdAt": 2019-02-12T21:01:22.479Z,
            "executionStatus": Object {
              "lastExecutionDate": 2019-02-12T21:01:22.000Z,
              "status": "pending",
            },
            "id": "1",
            "name": "fakeRuleName",
            "notifyWhen": "onActiveAlert",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "snoozeSchedule": Array [],
            "systemActions": Array [],
            "updatedAt": 2019-02-12T21:01:22.479Z,
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 1,
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "fields": undefined,
          "filter": undefined,
          "sortField": undefined,
          "type": "alert",
        },
      ]
    `);
  });

  test('finds rules with actions using preconfigured connectors', async () => {
    unsecuredSavedObjectsClient.find.mockReset();
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
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
                actionRef: 'preconfigured:preconfigured',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.find({ options: {} });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
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
              Object {
                "actionTypeId": undefined,
                "group": "default",
                "id": "preconfigured",
                "params": Object {
                  "foo": true,
                },
                "uuid": undefined,
              },
            ],
            "alertTypeId": "myType",
            "createdAt": 2019-02-12T21:01:22.479Z,
            "executionStatus": Object {
              "lastExecutionDate": 2019-02-12T21:01:22.000Z,
              "status": "pending",
            },
            "id": "1",
            "notifyWhen": "onActiveAlert",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "snoozeSchedule": Array [],
            "systemActions": Array [],
            "updatedAt": 2019-02-12T21:01:22.479Z,
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 1,
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "fields": undefined,
          "filter": undefined,
          "sortField": undefined,
          "type": "alert",
        },
      ]
    `);
  });

  test('finds rules with actions using system connectors', async () => {
    unsecuredSavedObjectsClient.find.mockReset();
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 1,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
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
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
      ],
    });

    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.find({ options: {} });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
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
            "alertTypeId": "myType",
            "createdAt": 2019-02-12T21:01:22.479Z,
            "executionStatus": Object {
              "lastExecutionDate": 2019-02-12T21:01:22.000Z,
              "status": "pending",
            },
            "id": "1",
            "notifyWhen": "onActiveAlert",
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
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 1,
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "fields": undefined,
          "filter": undefined,
          "sortField": undefined,
          "type": "alert",
        },
      ]
    `);
  });

  test('calls mapSortField', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    await rulesClient.find({ options: { sortField: 'name' } });
    expect(
      jest.requireMock('../../../../rules_client/common/map_sort_field').mapSortField
    ).toHaveBeenCalledWith('name');
  });

  test('should translate filter/sort/search on params to mapped_params', async () => {
    const filter = fromKueryExpression(
      '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))'
    );
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });

    const rulesClient = new RulesClient(rulesClientParams);
    await rulesClient.find({
      options: {
        sortField: 'params.risk_score',
        searchFields: ['params.risk_score', 'params.severity'],
        filter: 'alert.attributes.params.risk_score > 50',
      },
      excludeFromPublicApi: true,
    });

    const findCallParams = unsecuredSavedObjectsClient.find.mock.calls[0][0];

    expect(findCallParams.searchFields).toEqual([
      'mapped_params.risk_score',
      'mapped_params.severity',
    ]);

    expect(findCallParams.filter.arguments[0].arguments[0].value).toEqual(
      'alert.attributes.mapped_params.risk_score'
    );
  });

  test('should call useSavedObjectReferences.injectReferences if defined for rule type', async () => {
    jest.resetAllMocks();
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    const injectReferencesFn = jest.fn().mockReturnValue({
      bar: true,
      parameterThatIsSavedObjectId: '9',
    });

    const ruleTypes = new Map<string, RegistryRuleType>([
      [
        'myType',
        {
          actionGroups: [],
          recoveryActionGroup: RecoveredActionGroup,
          actionVariables: undefined,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          id: 'myType',
          name: 'myType',
          category: 'test',
          producer: 'myApp',
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ],
      [
        '123',
        {
          actionGroups: [],
          recoveryActionGroup: RecoveredActionGroup,
          actionVariables: undefined,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          id: '123',
          name: 'myType',
          category: 'test',
          producer: 'myApp',
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ],
    ]);

    ruleTypeRegistry.list.mockReturnValue(ruleTypes);
    ruleTypeRegistry.get.mockImplementationOnce(() => ({
      id: 'myType',
      name: 'myType',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'myApp',
      validate: {
        params: schema.any(),
      },
      validLegacyConsumers: [],
    }));
    ruleTypeRegistry.get.mockImplementationOnce(() => ({
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
        params: schema.any(),
      },
      validLegacyConsumers: [],
    }));
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
        {
          id: '2',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: '123',
            schedule: { interval: '20s' },
            params: {
              bar: true,
              parameterThatIsSavedObjectRef: 'soRef_0',
            },
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
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
      ],
    });
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.find({ options: {} });

    expect(injectReferencesFn).toHaveBeenCalledTimes(1);
    expect(injectReferencesFn).toHaveBeenCalledWith(
      {
        bar: true,
        parameterThatIsSavedObjectRef: 'soRef_0',
      },
      [{ id: '9', name: 'soRef_0', type: 'someSavedObjectType' }]
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "data": Array [
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
            "alertTypeId": "myType",
            "createdAt": 2019-02-12T21:01:22.479Z,
            "executionStatus": Object {
              "lastExecutionDate": 2019-02-12T21:01:22.000Z,
              "status": "pending",
            },
            "id": "1",
            "notifyWhen": "onActiveAlert",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "snoozeSchedule": Array [],
            "systemActions": Array [],
            "updatedAt": 2019-02-12T21:01:22.479Z,
          },
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
            "createdAt": 2019-02-12T21:01:22.479Z,
            "executionStatus": Object {
              "lastExecutionDate": 2019-02-12T21:01:22.000Z,
              "status": "pending",
            },
            "id": "2",
            "notifyWhen": "onActiveAlert",
            "params": Object {
              "bar": true,
              "parameterThatIsSavedObjectId": "9",
            },
            "schedule": Object {
              "interval": "20s",
            },
            "snoozeSchedule": Array [],
            "systemActions": Array [],
            "updatedAt": 2019-02-12T21:01:22.479Z,
          },
        ],
        "page": 1,
        "perPage": 10,
        "total": 2,
      }
    `);
  });

  test('throws an error if useSavedObjectReferences.injectReferences throws an error', async () => {
    jest.resetAllMocks();
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    const injectReferencesFn = jest.fn().mockImplementation(() => {
      throw new Error('something went wrong!');
    });

    const ruleTypes = new Map<string, RegistryRuleType>([
      [
        'myType',
        {
          actionGroups: [],
          recoveryActionGroup: RecoveredActionGroup,
          actionVariables: undefined,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          id: 'myType',
          name: 'myType',
          category: 'test',
          producer: 'myApp',
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ],
      [
        '123',
        {
          actionGroups: [],
          recoveryActionGroup: RecoveredActionGroup,
          actionVariables: undefined,
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          id: '123',
          name: 'myType',
          category: 'test',
          producer: 'myApp',
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ],
    ]);

    ruleTypeRegistry.list.mockReturnValue(ruleTypes);
    ruleTypeRegistry.get.mockImplementationOnce(() => ({
      id: 'myType',
      name: 'myType',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'myApp',
      validate: {
        params: schema.any(),
      },
      validLegacyConsumers: [],
    }));

    ruleTypeRegistry.get.mockImplementationOnce(() => ({
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
        params: schema.any(),
      },
      validLegacyConsumers: [],
    }));
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      total: 2,
      per_page: 10,
      page: 1,
      saved_objects: [
        {
          id: '1',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: 'myType',
            schedule: { interval: '10s' },
            params: {
              bar: true,
            },
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
          references: [
            {
              name: 'action_0',
              type: 'action',
              id: '1',
            },
          ],
        },
        {
          id: '2',
          type: RULE_SAVED_OBJECT_TYPE,
          attributes: {
            alertTypeId: '123',
            schedule: { interval: '20s' },
            params: {
              bar: true,
              parameterThatIsSavedObjectRef: 'soRef_0',
            },
            executionStatus: {
              status: 'pending',
              lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            notifyWhen: 'onActiveAlert',
            actions: [
              {
                group: 'default',
                actionRef: 'action_0',
                params: {
                  foo: true,
                },
              },
            ],
          },
          score: 1,
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
      ],
    });
    const rulesClient = new RulesClient(rulesClientParams);
    await expect(rulesClient.find({ options: {} })).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error injecting reference into rule params for rule id 2 - something went wrong!"`
    );
  });

  describe('authorization', () => {
    test('ensures user is query filter types down to those the user is authorized to find', async () => {
      const filter = fromKueryExpression(
        '((alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myApp) or (alert.attributes.alertTypeId:myOtherType and alert.attributes.consumer:myOtherApp))'
      );
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        filter,
        ensureRuleTypeIsAuthorized() {},
      });

      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.find({ options: { filter: 'someTerm' } });

      const [options] = unsecuredSavedObjectsClient.find.mock.calls[0];
      expect(options.filter).toEqual(
        nodeTypes.function.buildNode('and', [fromKueryExpression('someTerm'), filter])
      );
      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledTimes(1);
    });

    test('throws if user is not authorized to find any types', async () => {
      const rulesClient = new RulesClient(rulesClientParams);
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('not authorized'));
      await expect(rulesClient.find({ options: {} })).rejects.toThrowErrorMatchingInlineSnapshot(
        `"not authorized"`
      );
    });

    test('ensures authorization even when the fields required to authorize are omitted from the find', async () => {
      const ensureRuleTypeIsAuthorized = jest.fn();
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        ensureRuleTypeIsAuthorized,
      });

      unsecuredSavedObjectsClient.find.mockReset();
      unsecuredSavedObjectsClient.find.mockResolvedValue({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [
          {
            id: '1',
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              actions: [],
              executionStatus: {
                status: 'pending',
                lastExecutionDate: new Date('2019-02-12T21:01:22.479Z'),
              },
              alertTypeId: 'myType',
              consumer: 'myApp',
              tags: ['myTag'],
            },
            score: 1,
            references: [],
          },
        ],
      });

      const rulesClient = new RulesClient(rulesClientParams);
      expect(await rulesClient.find({ options: { fields: ['tags'] } })).toMatchInlineSnapshot(`
        Object {
          "data": Array [
            Object {
              "actions": Array [],
              "id": "1",
              "notifyWhen": undefined,
              "params": undefined,
              "schedule": undefined,
              "snoozeSchedule": Array [],
              "systemActions": Array [],
              "tags": Array [
                "myTag",
              ],
            },
          ],
          "page": 1,
          "perPage": 10,
          "total": 1,
        }
      `);

      expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
        fields: ['tags', 'alertTypeId', 'consumer'],
        filter: undefined,
        sortField: undefined,
        type: RULE_SAVED_OBJECT_TYPE,
      });
      expect(ensureRuleTypeIsAuthorized).toHaveBeenCalledWith('myType', 'myApp', 'rule');
    });

    test('calls getFindAuthorizationFilter correctly', async () => {
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        ensureRuleTypeIsAuthorized() {},
      });

      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.find({ options: { ruleTypeIds: ['foo'], consumers: ['bar'] } });

      expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
        authorizationEntity: 'rule',
        filterOpts: {
          fieldNames: {
            consumer: 'alert.attributes.consumer',
            ruleTypeId: 'alert.attributes.alertTypeId',
          },
          type: 'kql',
        },
      });
    });

    test('combines the filters with the auth filter correctly', async () => {
      const filter = fromKueryExpression(
        'alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp'
      );

      authorization.getFindAuthorizationFilter.mockResolvedValue({
        filter,
        ensureRuleTypeIsAuthorized() {},
      });

      const rulesClient = new RulesClient(rulesClientParams);
      await rulesClient.find({
        options: {
          ruleTypeIds: ['foo'],
          consumers: ['bar'],
          filter: `alert.attributes.tags: ['bar']`,
        },
      });

      const finalFilter = unsecuredSavedObjectsClient.find.mock.calls[0][0].filter;

      expect(toKqlExpression(finalFilter)).toMatchInlineSnapshot(
        `"((alert.attributes.tags: ['bar'] AND alert.attributes.alertTypeId: foo AND alert.attributes.consumer: bar) AND (alert.attributes.alertTypeId: myType AND alert.attributes.consumer: myApp))"`
      );
    });
  });

  describe('auditLogger', () => {
    test('logs audit event when searching rules', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      await rulesClient.find();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find',
            outcome: 'success',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fakeRuleName' } },
        })
      );
    });

    test('logs audit event when not authorised to search rules', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('Unauthorized'));

      await expect(rulesClient.find()).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find',
            outcome: 'failure',
          }),
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });

    test('logs audit event when not authorised to search rule type', async () => {
      const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
      authorization.getFindAuthorizationFilter.mockResolvedValue({
        ensureRuleTypeIsAuthorized: jest.fn(() => {
          throw new Error('Unauthorized');
        }),
      });

      await expect(async () => await rulesClient.find()).rejects.toThrow();
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'rule_find',
            outcome: 'failure',
          }),
          kibana: { saved_object: { id: '1', type: RULE_SAVED_OBJECT_TYPE, name: 'fakeRuleName' } },
          error: {
            code: 'Error',
            message: 'Unauthorized',
          },
        })
      );
    });
  });

  describe('legacy actions migration for SIEM', () => {
    test('should call migrateLegacyActions', async () => {
      const rulesClient = new RulesClient(rulesClientParams);

      (formatLegacyActions as jest.Mock).mockResolvedValueOnce([
        { ...siemRule1, migrated: true },
        { ...siemRule2, migrated: true },
      ]);

      unsecuredSavedObjectsClient.find.mockReset();
      unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
        total: 1,
        per_page: 10,
        page: 1,
        saved_objects: [enabledRule1, enabledRule2, siemRule1, siemRule2].map((r) => ({
          ...r,
          score: 1,
        })),
      });

      const result = await rulesClient.find({ options: {} });

      expect(formatLegacyActions).toHaveBeenCalledTimes(1);
      expect(formatLegacyActions).toHaveBeenCalledWith(
        [
          expect.objectContaining({ id: siemRule1.id }),
          expect.objectContaining({ id: siemRule2.id }),
        ],
        expect.any(Object)
      );
      expect(result.data[2]).toEqual(expect.objectContaining({ id: siemRule1.id, migrated: true }));
      expect(result.data[3]).toEqual(expect.objectContaining({ id: siemRule2.id, migrated: true }));
    });
  });
});

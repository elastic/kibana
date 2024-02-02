/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../../../../rules_client';
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
import { getBeforeSetup, setGlobalDate } from '../../../../rules_client/tests/lib';

import { RegistryRuleType } from '../../../../rule_type_registry';
import { fromKueryExpression, nodeTypes } from '@kbn/es-query';
import { RecoveredActionGroup } from '../../../../../common';
import { DefaultRuleAggregationResult } from '../../../../routes/rule/apis/aggregate/types';
import { defaultRuleAggregationFactory } from '.';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';

const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();

const kibanaVersion = 'v7.10.0';
const rulesClientParams: jest.Mocked<ConstructorOptions> = {
  taskManager,
  ruleTypeRegistry,
  unsecuredSavedObjectsClient,
  minimumScheduleInterval: { value: '1m', enforce: false },
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
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  maxScheduledPerMinute: 1000,
  internalSavedObjectsRepository,
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
};

beforeEach(() => {
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

setGlobalDate();

describe('aggregate()', () => {
  const listedTypes = new Set<RegistryRuleType>([
    {
      actionGroups: [],
      actionVariables: undefined,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      id: 'myType',
      name: 'myType',
      category: 'test',
      producer: 'myApp',
      enabledInLicense: true,
      hasAlertsMappings: false,
      hasFieldsForAAD: false,
      validLegacyConsumers: [],
    },
  ]);
  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });
    unsecuredSavedObjectsClient.find.mockResolvedValueOnce({
      total: 30,
      per_page: 0,
      page: 1,
      saved_objects: [],
      aggregations: {
        status: {
          buckets: [
            { key: 'active', doc_count: 8 },
            { key: 'error', doc_count: 6 },
            { key: 'ok', doc_count: 10 },
            { key: 'pending', doc_count: 4 },
            { key: 'unknown', doc_count: 2 },
            { key: 'warning', doc_count: 1 },
          ],
        },
        outcome: {
          buckets: [
            { key: 'succeeded', doc_count: 2 },
            { key: 'failed', doc_count: 4 },
            { key: 'warning', doc_count: 6 },
          ],
        },
        enabled: {
          buckets: [
            { key: 0, key_as_string: '0', doc_count: 2 },
            { key: 1, key_as_string: '1', doc_count: 28 },
          ],
        },
        muted: {
          buckets: [
            { key: 0, key_as_string: '0', doc_count: 27 },
            { key: 1, key_as_string: '1', doc_count: 3 },
          ],
        },
        snoozed: {
          doc_count: 0,
          count: {
            doc_count: 0,
          },
        },
        tags: {
          buckets: [
            {
              key: 'a',
              doc_count: 10,
            },
            {
              key: 'b',
              doc_count: 20,
            },
            {
              key: 'c',
              doc_count: 30,
            },
          ],
        },
      },
    });

    ruleTypeRegistry.list.mockReturnValue(listedTypes);
    authorization.filterByRuleTypeAuthorization.mockResolvedValue(
      new Set([
        {
          id: 'myType',
          name: 'Test',
          actionGroups: [{ id: 'default', name: 'Default' }],
          defaultActionGroupId: 'default',
          minimumLicenseRequired: 'basic',
          isExportable: true,
          recoveryActionGroup: RecoveredActionGroup,
          category: 'test',
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
          enabledInLicense: true,
          hasAlertsMappings: false,
          hasFieldsForAAD: false,
          validLegacyConsumers: [],
        },
      ])
    );
  });

  test('calls saved objects client with given params to perform aggregation', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.aggregate<DefaultRuleAggregationResult>({
      options: {},
      aggs: defaultRuleAggregationFactory(),
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "enabled": Object {
          "buckets": Array [
            Object {
              "doc_count": 2,
              "key": 0,
              "key_as_string": "0",
            },
            Object {
              "doc_count": 28,
              "key": 1,
              "key_as_string": "1",
            },
          ],
        },
        "muted": Object {
          "buckets": Array [
            Object {
              "doc_count": 27,
              "key": 0,
              "key_as_string": "0",
            },
            Object {
              "doc_count": 3,
              "key": 1,
              "key_as_string": "1",
            },
          ],
        },
        "outcome": Object {
          "buckets": Array [
            Object {
              "doc_count": 2,
              "key": "succeeded",
            },
            Object {
              "doc_count": 4,
              "key": "failed",
            },
            Object {
              "doc_count": 6,
              "key": "warning",
            },
          ],
        },
        "snoozed": Object {
          "count": Object {
            "doc_count": 0,
          },
          "doc_count": 0,
        },
        "status": Object {
          "buckets": Array [
            Object {
              "doc_count": 8,
              "key": "active",
            },
            Object {
              "doc_count": 6,
              "key": "error",
            },
            Object {
              "doc_count": 10,
              "key": "ok",
            },
            Object {
              "doc_count": 4,
              "key": "pending",
            },
            Object {
              "doc_count": 2,
              "key": "unknown",
            },
            Object {
              "doc_count": 1,
              "key": "warning",
            },
          ],
        },
        "tags": Object {
          "buckets": Array [
            Object {
              "doc_count": 10,
              "key": "a",
            },
            Object {
              "doc_count": 20,
              "key": "b",
            },
            Object {
              "doc_count": 30,
              "key": "c",
            },
          ],
        },
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);

    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toEqual([
      {
        filter: undefined,
        page: 1,
        perPage: 0,
        type: RULE_SAVED_OBJECT_TYPE,
        aggs: {
          status: {
            terms: { field: 'alert.attributes.executionStatus.status' },
          },
          outcome: {
            terms: { field: 'alert.attributes.lastRun.outcome' },
          },
          enabled: {
            terms: { field: 'alert.attributes.enabled' },
          },
          muted: {
            terms: { field: 'alert.attributes.muteAll' },
          },
          snoozed: {
            aggs: {
              count: {
                filter: {
                  exists: {
                    field: 'alert.attributes.snoozeSchedule.duration',
                  },
                },
              },
            },
            nested: {
              path: 'alert.attributes.snoozeSchedule',
            },
          },
          tags: {
            terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 50 },
          },
        },
      },
    ]);
  });

  test('supports filters when aggregating', async () => {
    const authFilter = fromKueryExpression(
      'alert.attributes.alertTypeId:myType and alert.attributes.consumer:myApp'
    );
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter: authFilter,
      ensureRuleTypeIsAuthorized() {},
    });

    const rulesClient = new RulesClient(rulesClientParams);
    await rulesClient.aggregate({
      options: { filter: 'foo: someTerm' },
      aggs: defaultRuleAggregationFactory(),
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toEqual([
      {
        fields: undefined,
        filter: nodeTypes.function.buildNode('and', [
          fromKueryExpression('foo: someTerm'),
          authFilter,
        ]),
        page: 1,
        perPage: 0,
        type: RULE_SAVED_OBJECT_TYPE,
        aggs: {
          status: {
            terms: { field: 'alert.attributes.executionStatus.status' },
          },
          outcome: {
            terms: { field: 'alert.attributes.lastRun.outcome' },
          },
          enabled: {
            terms: { field: 'alert.attributes.enabled' },
          },
          muted: {
            terms: { field: 'alert.attributes.muteAll' },
          },
          snoozed: {
            aggs: {
              count: {
                filter: {
                  exists: {
                    field: 'alert.attributes.snoozeSchedule.duration',
                  },
                },
              },
            },
            nested: {
              path: 'alert.attributes.snoozeSchedule',
            },
          },
          tags: {
            terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 50 },
          },
        },
      },
    ]);
  });

  test('logs audit event when not authorized to aggregate rules', async () => {
    const rulesClient = new RulesClient({ ...rulesClientParams, auditLogger });
    authorization.getFindAuthorizationFilter.mockRejectedValue(new Error('Unauthorized'));

    await expect(
      rulesClient.aggregate({ aggs: defaultRuleAggregationFactory() })
    ).rejects.toThrow();
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action: 'rule_aggregate',
          outcome: 'failure',
        }),
        error: {
          code: 'Error',
          message: 'Unauthorized',
        },
      })
    );
  });

  describe('tags number limit', () => {
    test('sets to default (50) if it is not provided', async () => {
      const rulesClient = new RulesClient(rulesClientParams);

      await rulesClient.aggregate({ aggs: defaultRuleAggregationFactory() });

      expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchObject([
        {
          aggs: {
            tags: {
              terms: { size: 50 },
            },
          },
        },
      ]);
    });

    test('sets to the provided value', async () => {
      const rulesClient = new RulesClient(rulesClientParams);

      await rulesClient.aggregate({
        aggs: defaultRuleAggregationFactory({ maxTags: 1000 }),
      });

      expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toMatchObject([
        {
          aggs: {
            tags: {
              terms: { size: 1000 },
            },
          },
        },
      ]);
    });
  });
});

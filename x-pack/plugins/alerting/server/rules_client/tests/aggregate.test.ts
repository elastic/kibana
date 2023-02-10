/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient, ConstructorOptions } from '../rules_client';
import { savedObjectsClientMock, loggingSystemMock } from '@kbn/core/server/mocks';
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
import { RegistryRuleType } from '../../rule_type_registry';
import { fromKueryExpression, nodeTypes } from '@kbn/es-query';

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
      producer: 'myApp',
      enabledInLicense: true,
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
          producer: 'alerts',
          authorizedConsumers: {
            myApp: { read: true, all: true },
          },
          enabledInLicense: true,
        },
      ])
    );
  });

  test('calls saved objects client with given params to perform aggregation', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.aggregate({ options: {} });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "alertExecutionStatus": Object {
          "active": 8,
          "error": 6,
          "ok": 10,
          "pending": 4,
          "unknown": 2,
          "warning": 1,
        },
        "ruleEnabledStatus": Object {
          "disabled": 2,
          "enabled": 28,
        },
        "ruleLastRunOutcome": Object {
          "failed": 4,
          "succeeded": 2,
          "warning": 6,
        },
        "ruleMutedStatus": Object {
          "muted": 3,
          "unmuted": 27,
        },
        "ruleSnoozedStatus": Object {
          "snoozed": 0,
        },
        "ruleTags": Array [
          "a",
          "b",
          "c",
        ],
      }
    `);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(1);

    expect(unsecuredSavedObjectsClient.find.mock.calls[0]).toEqual([
      {
        filter: undefined,
        page: 1,
        perPage: 0,
        type: 'alert',
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
    await rulesClient.aggregate({ options: { filter: 'foo: someTerm' } });

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
        type: 'alert',
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

    await expect(rulesClient.aggregate()).rejects.toThrow();
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

      await rulesClient.aggregate();

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

      await rulesClient.aggregate({ options: { maxTags: 1000 } });

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

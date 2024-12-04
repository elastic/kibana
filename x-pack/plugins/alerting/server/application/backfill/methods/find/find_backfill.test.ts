/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { RULE_SAVED_OBJECT_TYPE } from '../../../..';
import { AlertingAuthorization } from '../../../../authorization';
import { alertingAuthorizationMock } from '../../../../authorization/alerting_authorization.mock';
import { backfillClientMock } from '../../../../backfill_client/backfill_client.mock';
import { ruleTypeRegistryMock } from '../../../../rule_type_registry.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core-saved-objects-api-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { fromKueryExpression } from '@kbn/es-query';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ConstructorOptions, RulesClient } from '../../../../rules_client';
import { adHocRunStatus } from '../../../../../common/constants';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { SavedObject } from '@kbn/core/server';
import { AdHocRunSO } from '../../../../data/ad_hoc_run/types';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { transformAdHocRunToBackfillResult } from '../../transforms';

const kibanaVersion = 'v8.0.0';
const taskManager = taskManagerMock.createStart();
const ruleTypeRegistry = ruleTypeRegistryMock.create();
const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
const encryptedSavedObjects = encryptedSavedObjectsMock.createClient();
const authorization = alertingAuthorizationMock.create();
const actionsAuthorization = actionsAuthorizationMock.create();
const auditLogger = auditLoggerMock.create();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const backfillClient = backfillClientMock.create();

const filter = fromKueryExpression(
  '((ad_hoc_run_params.attributes.rule.alertTypeId:myType and ad_hoc_run_params.attributes.rule.consumer:myApp) or (ad_hoc_run_params.attributes.rule.alertTypeId:myOtherType and ad_hoc_run_params.attributes.rule.consumer:myApp) or (ad_hoc_run_params.attributes.rule.alertTypeId:myOtherType and ad_hoc_run_params.attributes.rule.consumer:myOtherApp))'
);

const authDslFilter = {
  arguments: [
    {
      arguments: [
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'ad_hoc_run_params.attributes.rule.alertTypeId',
            },
            { isQuoted: false, type: 'literal', value: 'myType' },
          ],
          function: 'is',
          type: 'function',
        },
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'ad_hoc_run_params.attributes.rule.consumer',
            },
            { isQuoted: false, type: 'literal', value: 'myApp' },
          ],
          function: 'is',
          type: 'function',
        },
      ],
      function: 'and',
      type: 'function',
    },
    {
      arguments: [
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'ad_hoc_run_params.attributes.rule.alertTypeId',
            },
            { isQuoted: false, type: 'literal', value: 'myOtherType' },
          ],
          function: 'is',
          type: 'function',
        },
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'ad_hoc_run_params.attributes.rule.consumer',
            },
            { isQuoted: false, type: 'literal', value: 'myApp' },
          ],
          function: 'is',
          type: 'function',
        },
      ],
      function: 'and',
      type: 'function',
    },
    {
      arguments: [
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'ad_hoc_run_params.attributes.rule.alertTypeId',
            },
            { isQuoted: false, type: 'literal', value: 'myOtherType' },
          ],
          function: 'is',
          type: 'function',
        },
        {
          arguments: [
            {
              isQuoted: false,
              type: 'literal',
              value: 'ad_hoc_run_params.attributes.rule.consumer',
            },
            { isQuoted: false, type: 'literal', value: 'myOtherApp' },
          ],
          function: 'is',
          type: 'function',
        },
      ],
      function: 'and',
      type: 'function',
    },
  ],
  function: 'or',
  type: 'function',
};

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
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  backfillClient,
  isSystemAction: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  uiSettings: uiSettingsServiceMock.createStartContract(),
};

const fakeRuleName = 'fakeRuleName';

const mockAdHocRunSO: SavedObject<AdHocRunSO> = {
  id: '1',
  type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
  attributes: {
    apiKeyId: '123',
    apiKeyToUse: 'MTIzOmFiYw==',
    createdAt: '2024-01-30T00:00:00.000Z',
    duration: '12h',
    enabled: true,
    rule: {
      name: fakeRuleName,
      tags: ['foo'],
      alertTypeId: 'myType',
      // @ts-expect-error
      params: {},
      apiKeyOwner: 'user',
      apiKeyCreatedByUser: false,
      consumer: 'myApp',
      enabled: true,
      schedule: {
        interval: '12h',
      },
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: '2019-02-12T21:01:22.479Z',
      updatedAt: '2019-02-12T21:01:22.479Z',
      revision: 0,
    },
    spaceId: 'default',
    start: '2023-10-19T15:07:40.011Z',
    status: adHocRunStatus.PENDING,
    schedule: [
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T03:07:40.011Z',
      },
      {
        interval: '12h',
        status: adHocRunStatus.PENDING,
        runAt: '2023-10-20T15:07:40.011Z',
      },
    ],
  },
  references: [{ id: 'abc', name: 'rule', type: RULE_SAVED_OBJECT_TYPE }],
};

describe('findBackfill()', () => {
  let rulesClient: RulesClient;

  beforeEach(async () => {
    jest.resetAllMocks();
    rulesClient = new RulesClient(rulesClientParams);
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      filter,
      ensureRuleTypeIsAuthorized() {},
    });
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [{ ...mockAdHocRunSO, score: 0 }],
      per_page: 10,
      page: 1,
      total: 1,
    });
  });

  test('should successfully find backfill with no filter', async () => {
    const result = await rulesClient.findBackfill({ page: 1, perPage: 10 });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: authDslFilter,
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  test('should successfully find backfill with rule id', async () => {
    const result = await rulesClient.findBackfill({ page: 1, perPage: 10, ruleIds: 'abc' });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: authDslFilter,
      hasReference: [{ id: 'abc', type: RULE_SAVED_OBJECT_TYPE }],
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  test('should successfully find backfill with start', async () => {
    const result = await rulesClient.findBackfill({
      page: 1,
      perPage: 10,
      start: '2024-03-29T02:07:55Z',
    });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: {
        type: 'function',
        function: 'and',
        arguments: [
          {
            type: 'function',
            function: 'range',
            arguments: [
              { isQuoted: false, type: 'literal', value: 'ad_hoc_run_params.attributes.start' },
              'gte',
              { isQuoted: true, type: 'literal', value: '2024-03-29T02:07:55Z' },
            ],
          },
          authDslFilter,
        ],
      },
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  test('should successfully find backfill with end', async () => {
    const result = await rulesClient.findBackfill({
      page: 1,
      perPage: 10,
      end: '2024-03-29T02:07:55Z',
    });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: {
        type: 'function',
        function: 'and',
        arguments: [
          {
            type: 'function',
            function: 'range',
            arguments: [
              { isQuoted: false, type: 'literal', value: 'ad_hoc_run_params.attributes.end' },
              'lte',
              { isQuoted: true, type: 'literal', value: '2024-03-29T02:07:55Z' },
            ],
          },
          authDslFilter,
        ],
      },
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  test('should successfully find backfill with start and end', async () => {
    const result = await rulesClient.findBackfill({
      page: 1,
      perPage: 10,
      start: '2024-02-09T02:07:55Z',
      end: '2024-03-29T02:07:55Z',
    });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: {
        type: 'function',
        function: 'and',
        arguments: [
          {
            type: 'function',
            function: 'and',
            arguments: [
              {
                type: 'function',
                function: 'range',
                arguments: [
                  { isQuoted: false, type: 'literal', value: 'ad_hoc_run_params.attributes.start' },
                  'gte',
                  { isQuoted: true, type: 'literal', value: '2024-02-09T02:07:55Z' },
                ],
              },
              {
                type: 'function',
                function: 'range',
                arguments: [
                  { isQuoted: false, type: 'literal', value: 'ad_hoc_run_params.attributes.end' },
                  'lte',
                  { isQuoted: true, type: 'literal', value: '2024-03-29T02:07:55Z' },
                ],
              },
            ],
          },
          authDslFilter,
        ],
      },
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  test('should successfully find backfill with rule id, start and end', async () => {
    const result = await rulesClient.findBackfill({
      page: 1,
      perPage: 10,
      start: '2024-02-09T02:07:55Z',
      end: '2024-03-29T02:07:55Z',
      ruleIds: 'abc',
    });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: {
        type: 'function',
        function: 'and',
        arguments: [
          {
            type: 'function',
            function: 'and',
            arguments: [
              {
                type: 'function',
                function: 'range',
                arguments: [
                  { isQuoted: false, type: 'literal', value: 'ad_hoc_run_params.attributes.start' },
                  'gte',
                  { isQuoted: true, type: 'literal', value: '2024-02-09T02:07:55Z' },
                ],
              },
              {
                type: 'function',
                function: 'range',
                arguments: [
                  { isQuoted: false, type: 'literal', value: 'ad_hoc_run_params.attributes.end' },
                  'lte',
                  { isQuoted: true, type: 'literal', value: '2024-03-29T02:07:55Z' },
                ],
              },
            ],
          },
          authDslFilter,
        ],
      },
      hasReference: [{ id: 'abc', type: RULE_SAVED_OBJECT_TYPE }],
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  test('should pass sort options to savedObjectsClient.find', async () => {
    const result = await rulesClient.findBackfill({
      page: 1,
      perPage: 10,
      sortField: 'createdAt',
      sortOrder: 'asc',
    });

    expect(authorization.getFindAuthorizationFilter).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      filterOpts: {
        fieldNames: {
          consumer: 'ad_hoc_run_params.attributes.rule.consumer',
          ruleTypeId: 'ad_hoc_run_params.attributes.rule.alertTypeId',
        },
        type: 'kql',
      },
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledWith({
      filter: authDslFilter,
      page: 1,
      perPage: 10,
      type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
      sortField: 'createdAt',
      sortOrder: 'asc',
    });

    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'ad_hoc_run_find',
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        saved_object: {
          id: '1',
          type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
          name: 'backfill for rule "fakeRuleName"',
        },
      },
      message:
        'User has found ad hoc run for ad_hoc_run_params [id=1] backfill for rule "fakeRuleName"',
    });

    expect(result).toEqual({
      page: 1,
      perPage: 10,
      total: 1,
      data: [transformAdHocRunToBackfillResult(mockAdHocRunSO)],
    });
  });

  describe('error handling', () => {
    test('should throw error when params are invalid', async () => {
      await expect(
        rulesClient.findBackfill({
          // @ts-expect-error
          page: 'foo',
          perPage: 10,
          start: '2024-02-09T02:07:55Z',
          end: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find backfills: Could not validate find parameters \\"{\\"page\\":\\"foo\\",\\"perPage\\":10,\\"start\\":\\"2024-02-09T02:07:55Z\\",\\"end\\":\\"2024-03-29T02:07:55Z\\"}\\" - [page]: expected value of type [number] but got [string]"`
      );
      await expect(
        rulesClient.findBackfill({
          page: 1,
          // @ts-expect-error
          perPage: 'foo',
          start: '2024-02-09T02:07:55Z',
          end: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find backfills: Could not validate find parameters \\"{\\"page\\":1,\\"perPage\\":\\"foo\\",\\"start\\":\\"2024-02-09T02:07:55Z\\",\\"end\\":\\"2024-03-29T02:07:55Z\\"}\\" - [perPage]: expected value of type [number] but got [string]"`
      );
      await expect(
        rulesClient.findBackfill({
          page: 1,
          perPage: 10,
          start: 'foo',
          end: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find backfills: Could not validate find parameters \\"{\\"page\\":1,\\"perPage\\":10,\\"start\\":\\"foo\\",\\"end\\":\\"2024-03-29T02:07:55Z\\"}\\" - [start]: query start must be valid date"`
      );
      await expect(
        rulesClient.findBackfill({
          page: 1,
          perPage: 10,
          end: 'foo',
          start: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Failed to find backfills: Could not validate find parameters \\"{\\"page\\":1,\\"perPage\\":10,\\"end\\":\\"foo\\",\\"start\\":\\"2024-03-29T02:07:55Z\\"}\\" - [end]: query end must be valid date"`
      );
      await expect(
        rulesClient.findBackfill({
          page: 1,
          perPage: 10,
          // @ts-expect-error
          sortField: 'abc',
          start: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `
"Failed to find backfills: Could not validate find parameters \\"{\\"page\\":1,\\"perPage\\":10,\\"sortField\\":\\"abc\\",\\"start\\":\\"2024-03-29T02:07:55Z\\"}\\" - [sortField]: types that failed validation:
- [sortField.0]: expected value to equal [createdAt]
- [sortField.1]: expected value to equal [start]"
`
      );
      await expect(
        rulesClient.findBackfill({
          page: 1,
          perPage: 10,
          // @ts-expect-error
          sortOrder: 'abc',
          start: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `
"Failed to find backfills: Could not validate find parameters \\"{\\"page\\":1,\\"perPage\\":10,\\"sortOrder\\":\\"abc\\",\\"start\\":\\"2024-03-29T02:07:55Z\\"}\\" - [sortOrder]: types that failed validation:
- [sortOrder.0]: expected value to equal [asc]
- [sortOrder.1]: expected value to equal [desc]"
`
      );

      expect(authorization.getFindAuthorizationFilter).not.toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    });

    test('should throw error when getFindAuthorizationFilter throws error', async () => {
      authorization.getFindAuthorizationFilter.mockImplementationOnce(() => {
        throw new Error('error error');
      });
      await expect(
        rulesClient.findBackfill({
          page: 1,
          perPage: 10,
          start: '2024-02-09T02:07:55Z',
          end: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failed to find backfills: error error"`);

      expect(auditLogger.log).toHaveBeenCalledWith({
        error: { code: 'Error', message: 'error error' },
        event: {
          action: 'ad_hoc_run_find',
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: { saved_object: undefined },
        message: 'Failed attempt to find ad hoc run for an ad hoc run',
      });
      expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    });

    test('should throw error when unsecuredSavedObjectsClient.find throws error', async () => {
      unsecuredSavedObjectsClient.find.mockImplementationOnce(() => {
        throw new Error('error finding');
      });
      await expect(
        rulesClient.findBackfill({
          page: 1,
          perPage: 10,
          start: '2024-02-09T02:07:55Z',
          end: '2024-03-29T02:07:55Z',
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Failed to find backfills: error finding"`);
    });
  });
});

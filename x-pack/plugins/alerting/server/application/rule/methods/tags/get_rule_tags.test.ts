/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 } from 'uuid';
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
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { actionsAuthorizationMock } from '@kbn/actions-plugin/server/mocks';
import { AlertingAuthorization } from '../../../../authorization/alerting_authorization';
import { ActionsAuthorization } from '@kbn/actions-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { getBeforeSetup } from '../../../../rules_client/tests/lib';
import { RecoveredActionGroup } from '../../../../../common';
import { RegistryRuleType } from '../../../../rule_type_registry';
import { ConnectorAdapterRegistry } from '../../../../connector_adapters/connector_adapter_registry';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { DEFAULT_MAX_ALERTS } from '../../../../config';

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
  maxScheduledPerMinute: 10000,
  minimumScheduleInterval: { value: '1m', enforce: false },
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
  isAuthenticationTypeAPIKey: jest.fn(),
  getAuthenticationAPIKey: jest.fn(),
  connectorAdapterRegistry: new ConnectorAdapterRegistry(),
  getAlertIndicesAlias: jest.fn(),
  alertsService: null,
  uiSettings: uiSettingsServiceMock.createStartContract(),
  isSystemAction: jest.fn(),
  maxAlertsPerRun: DEFAULT_MAX_ALERTS,
};

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
  getBeforeSetup(rulesClientParams, taskManager, ruleTypeRegistry);
  (auditLogger.log as jest.Mock).mockClear();
});

const getMockAggregationResult = (tags: string[]) => {
  return {
    aggregations: {
      tags: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: tags.map((tag) => ({
          key: tag,
          doc_count: 1,
        })),
      },
    },
    page: 1,
    per_page: 20,
    total: 1,
    saved_objects: [],
  };
};

describe('getTags()', () => {
  beforeEach(() => {
    authorization.getFindAuthorizationFilter.mockResolvedValue({
      ensureRuleTypeIsAuthorized() {},
    });

    unsecuredSavedObjectsClient.find.mockResolvedValue(getMockAggregationResult(['a', 'b', 'c']));

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

  test('calls saved objects client with given params to get rule tags', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    const result = await rulesClient.getTags({
      search: '',
      page: 1,
      perPage: 100,
    });

    expect(unsecuredSavedObjectsClient.find).toHaveBeenLastCalledWith({
      aggs: {
        tags: { terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 10000 } },
      },
      filter: undefined,
      type: RULE_SAVED_OBJECT_TYPE,
    });

    expect(result.data).toEqual(['a', 'b', 'c']);
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(100);
    expect(result.total).toEqual(3);
  });

  test('should paginate long results', async () => {
    const rulesClient = new RulesClient(rulesClientParams);

    const tags = [...Array(200)].map(() => v4());

    unsecuredSavedObjectsClient.find.mockResolvedValue(getMockAggregationResult(tags));

    let result = await rulesClient.getTags({
      search: '',
      page: 1,
      perPage: 10,
    });

    expect(result.data).toEqual(tags.slice(0, 10));
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(10);
    expect(result.total).toEqual(200);

    result = await rulesClient.getTags({
      search: '',
      page: 2,
      perPage: 10,
    });

    expect(result.data).toEqual(tags.slice(10, 20));
    expect(result.page).toEqual(2);
    expect(result.perPage).toEqual(10);
    expect(result.total).toEqual(200);

    result = await rulesClient.getTags({
      search: '',
      page: 20,
      perPage: 10,
    });

    expect(result.data).toEqual(tags.slice(190, 200));
    expect(result.page).toEqual(20);
    expect(result.perPage).toEqual(10);
    expect(result.total).toEqual(200);

    result = await rulesClient.getTags({
      search: '',
      page: 21,
      perPage: 10,
    });

    expect(result.data).toEqual([]);
    expect(result.page).toEqual(21);
    expect(result.perPage).toEqual(10);
    expect(result.total).toEqual(200);
  });

  test('should search and paginate for tags', async () => {
    const rulesClient = new RulesClient(rulesClientParams);

    const tags = [
      'a',
      'aa',
      'aaa',
      'a1',
      'a2',
      'a3',
      'a4',
      'a5',
      'a6',
      'a7',
      'b',
      'bb',
      'bbb',
      'c',
      'd',
      'e',
      'f',
      'g',
      '1',
      '11',
      '1_1',
      '11_1',
      '110',
      '2',
      '3',
      '4',
    ];

    unsecuredSavedObjectsClient.find.mockResolvedValue(getMockAggregationResult(tags));

    let result = await rulesClient.getTags({
      search: 'a',
      page: 1,
      perPage: 5,
    });

    expect(result.data).toEqual(['a', 'aa', 'aaa', 'a1', 'a2']);
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(5);
    expect(result.total).toEqual(10);

    result = await rulesClient.getTags({
      search: 'a',
      page: 2,
      perPage: 5,
    });

    expect(result.data).toEqual(['a3', 'a4', 'a5', 'a6', 'a7']);
    expect(result.page).toEqual(2);
    expect(result.perPage).toEqual(5);
    expect(result.total).toEqual(10);

    result = await rulesClient.getTags({
      search: 'aa',
      page: 1,
      perPage: 5,
    });

    expect(result.data).toEqual(['aa', 'aaa']);
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(5);
    expect(result.total).toEqual(2);

    result = await rulesClient.getTags({
      search: '1',
      page: 1,
      perPage: 5,
    });

    expect(result.data).toEqual(['1', '11', '1_1', '11_1', '110']);
    expect(result.page).toEqual(1);
    expect(result.perPage).toEqual(5);
    expect(result.total).toEqual(5);
  });

  test('should validate getTag inputs', async () => {
    const rulesClient = new RulesClient(rulesClientParams);
    await expect(rulesClient.getTags({ page: -1 })).rejects.toThrow(
      'Failed to validate params: [page]: Value must be equal to or greater than [1].'
    );

    await expect(rulesClient.getTags({ page: 1, perPage: 0 })).rejects.toThrow(
      'Failed to validate params: [perPage]: Value must be equal to or greater than [1].'
    );

    const result = await rulesClient.getTags({ page: 1 });
    expect(result.perPage).toEqual(50);
  });
});

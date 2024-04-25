/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
import { TaskRunnerFactory } from './task_runner_factory';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  loggingSystemMock,
  httpServiceMock,
  savedObjectsServiceMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { rulesClientMock } from '../mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { executionContextServiceMock } from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { rulesSettingsClientMock } from '../rules_settings_client.mock';
import { maintenanceWindowClientMock } from '../maintenance_window_client.mock';
import { alertsServiceMock } from '../alerts_service/alerts_service.mock';
import { schema } from '@kbn/config-schema';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';
import { TaskRunnerContext } from './types';
import { backfillClientMock } from '../backfill_client/backfill_client.mock';

const inMemoryMetrics = inMemoryMetricsMock.create();
const backfillClient = backfillClientMock.create();
const executionContext = executionContextServiceMock.createSetupContract();
const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const mockAlertService = alertsServiceMock.create();
const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
const uiSettingsService = uiSettingsServiceMock.createStartContract();
const elasticsearchService = elasticsearchServiceMock.createInternalStart();
const dataPlugin = dataPluginMock.createStartContract();
const dataViewsMock = {
  dataViewsServiceFactory: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
  getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
} as DataViewsServerPluginStart;
const ruleType: UntypedNormalizedRuleType = {
  id: 'test',
  name: 'My test alert',
  actionGroups: [{ id: 'default', name: 'Default' }],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  executor: jest.fn(),
  category: 'test',
  producer: 'alerts',
  validate: {
    params: schema.any(),
  },
  validLegacyConsumers: [],
};
let fakeTimer: sinon.SinonFakeTimers;

describe('Task Runner Factory', () => {
  let mockedTaskInstance: ConcreteTaskInstance;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = {
      id: '',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
      },
      taskType: 'alerting:test',
      params: {
        alertId: '1',
      },
      ownerId: null,
    };
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsPlugin = encryptedSavedObjectsMock.createStart();
  const rulesClient = rulesClientMock.create();
  const connectorAdapterRegistry = new ConnectorAdapterRegistry();

  const taskRunnerFactoryInitializerParams: jest.Mocked<TaskRunnerContext> = {
    backfillClient,
    data: dataPlugin,
    dataViews: dataViewsMock,
    savedObjects: savedObjectsService,
    share: {} as SharePluginStart,
    uiSettings: uiSettingsService,
    elasticsearch: elasticsearchService,
    getRulesClientWithRequest: jest.fn().mockReturnValue(rulesClient),
    actionsPlugin: actionsMock.createStart(),
    encryptedSavedObjectsClient: encryptedSavedObjectsPlugin.getClient(),
    logger: loggingSystemMock.create().get(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    basePathService: httpServiceMock.createBasePath(),
    eventLogger: eventLoggerMock.create(),
    ruleTypeRegistry: ruleTypeRegistryMock.create(),
    alertsService: mockAlertService,
    kibanaBaseUrl: 'https://localhost:5601',
    supportsEphemeralTasks: true,
    maxEphemeralActionsPerRule: 10,
    maxAlerts: 1000,
    cancelAlertsOnRuleTimeout: true,
    executionContext,
    usageCounter: mockUsageCounter,
    actionsConfigMap: {
      default: {
        max: 1000,
      },
    },
    getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClientMock.create()),
    getMaintenanceWindowClientWithRequest: jest
      .fn()
      .mockReturnValue(maintenanceWindowClientMock.create()),
    connectorAdapterRegistry,
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test(`throws an error if factory is initialized multiple times`, () => {
    const factory = new TaskRunnerFactory();
    factory.initialize(taskRunnerFactoryInitializerParams);
    expect(() =>
      factory.initialize(taskRunnerFactoryInitializerParams)
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory already initialized"`);
  });

  test(`throws an error if create is called when factory isn't initialized`, () => {
    const factory = new TaskRunnerFactory();
    expect(() =>
      factory.create(ruleType, { taskInstance: mockedTaskInstance }, inMemoryMetrics)
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
  });

  test(`throws an error if createAdHoc is called when factory isn't initialized`, () => {
    const factory = new TaskRunnerFactory();
    expect(() =>
      factory.createAdHoc({ taskInstance: mockedTaskInstance })
    ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
  });
});

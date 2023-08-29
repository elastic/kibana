/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import {
  RuleExecutorOptions,
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  Rule,
  RuleNotifyWhen,
  RuleAlertData,
} from '../types';
import { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskRunnerContext } from './task_runner_factory';
import { TaskRunner } from './task_runner';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
  httpServiceMock,
  executionContextServiceMock,
  savedObjectsServiceMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { actionsMock, actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { alertsMock, rulesClientMock } from '../mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { IEventLogger } from '@kbn/event-log-plugin/server';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import {
  mockDate,
  mockedRuleTypeSavedObject,
  ruleType,
  RULE_NAME,
  generateRunnerResult,
  RULE_ACTIONS,
  generateSavedObjectParams,
  mockTaskInstance,
  DATE_1970,
  DATE_1970_5_MIN,
  mockedRawRuleSO,
} from './fixtures';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { rulesSettingsClientMock } from '../rules_settings_client.mock';
import { maintenanceWindowClientMock } from '../maintenance_window_client.mock';
import { alertsServiceMock } from '../alerts_service/alerts_service.mock';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { alertsClientMock } from '../alerts_client/alerts_client.mock';
import * as LegacyAlertsClientModule from '../alerts_client/legacy_alerts_client';
import * as RuleRunMetricsStoreModule from '../lib/rule_run_metrics_store';
import { legacyAlertsClientMock } from '../alerts_client/legacy_alerts_client.mock';
import { ruleRunMetricsStoreMock } from '../lib/rule_run_metrics_store.mock';
import { AlertsService } from '../alerts_service';
import { ReplaySubject } from 'rxjs';
import { IAlertsClient } from '../alerts_client/types';
import { ConnectorAdapterRegistry } from '../connector_adapters/connector_adapter_registry';

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
}));

jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn(),
}));

jest.mock('../lib/alerting_event_logger/alerting_event_logger');

let fakeTimer: sinon.SinonFakeTimers;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const alertingEventLogger = alertingEventLoggerMock.create();
const clusterClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

const ruleTypeWithAlerts: jest.Mocked<UntypedNormalizedRuleType> = {
  ...ruleType,
  alerts: {
    context: 'test',
    mappings: {
      fieldMap: {
        textField: {
          type: 'keyword',
          required: false,
        },
        numericField: {
          type: 'long',
          required: false,
        },
      },
    },
    shouldWrite: true,
  },
};

describe('Task Runner', () => {
  let mockedTaskInstance: ConcreteTaskInstance;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = mockTaskInstance();
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
  const services = alertsMock.createRuleExecutorServices();
  const actionsClient = actionsClientMock.create();
  const rulesClient = rulesClientMock.create();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
  const elasticsearchService = elasticsearchServiceMock.createInternalStart();
  const dataPlugin = dataPluginMock.createStartContract();
  const uiSettingsService = uiSettingsServiceMock.createStartContract();
  const inMemoryMetrics = inMemoryMetricsMock.create();
  const dataViewsMock = {
    dataViewsServiceFactory: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
    getScriptedFieldsEnabled: jest.fn().mockReturnValue(true),
  } as DataViewsServerPluginStart;
  const mockAlertsService = alertsServiceMock.create();
  const mockAlertsClient = alertsClientMock.create();
  const mockLegacyAlertsClient = legacyAlertsClientMock.create();
  const ruleRunMetricsStore = ruleRunMetricsStoreMock.create();
  const maintenanceWindowClient = maintenanceWindowClientMock.create();
  const connectorAdapterRegistry = new ConnectorAdapterRegistry();

  type TaskRunnerFactoryInitializerParamsType = jest.Mocked<TaskRunnerContext> & {
    actionsPlugin: jest.Mocked<ActionsPluginStart>;
    eventLogger: jest.Mocked<IEventLogger>;
    executionContext: ReturnType<typeof executionContextServiceMock.createInternalStartContract>;
  };

  const taskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType = {
    data: dataPlugin,
    dataViews: dataViewsMock,
    savedObjects: savedObjectsService,
    share: {} as SharePluginStart,
    uiSettings: uiSettingsService,
    elasticsearch: elasticsearchService,
    actionsPlugin: actionsMock.createStart(),
    getRulesClientWithRequest: jest.fn().mockReturnValue(rulesClient),
    encryptedSavedObjectsClient,
    logger,
    executionContext: executionContextServiceMock.createInternalStartContract(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    basePathService: httpServiceMock.createBasePath(),
    eventLogger: eventLoggerMock.create(),
    internalSavedObjectsRepository: savedObjectsRepositoryMock.create(),
    ruleTypeRegistry,
    alertsService: mockAlertsService,
    kibanaBaseUrl: 'https://localhost:5601',
    supportsEphemeralTasks: false,
    maxEphemeralActionsPerRule: 10,
    maxAlerts: 1000,
    cancelAlertsOnRuleTimeout: true,
    usageCounter: mockUsageCounter,
    actionsConfigMap: {
      default: {
        max: 10000,
      },
    },
    getRulesSettingsClientWithRequest: jest.fn().mockReturnValue(rulesSettingsClientMock.create()),
    getMaintenanceWindowClientWithRequest: jest.fn().mockReturnValue(maintenanceWindowClient),
    connectorAdapterRegistry,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../lib/wrap_scoped_cluster_client')
      .createWrappedScopedClusterClientFactory.mockReturnValue({
        client: () => services.scopedClusterClient,
        getMetrics: () => ({
          numSearches: 3,
          esSearchDurationMs: 33,
          totalSearchDurationMs: 23423,
        }),
      });
    savedObjectsService.getScopedClient.mockReturnValue(services.savedObjectsClient);
    elasticsearchService.client.asScoped.mockReturnValue(services.scopedClusterClient);
    maintenanceWindowClient.getActiveMaintenanceWindows.mockResolvedValue([]);
    taskRunnerFactoryInitializerParams.getRulesClientWithRequest.mockReturnValue(rulesClient);
    taskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest.mockResolvedValue(
      actionsClient
    );
    taskRunnerFactoryInitializerParams.actionsPlugin.renderActionParameterTemplates.mockImplementation(
      (actionTypeId, actionId, params) => params
    );
    ruleTypeRegistry.get.mockReturnValue(ruleTypeWithAlerts);
    taskRunnerFactoryInitializerParams.executionContext.withContext.mockImplementation((ctx, fn) =>
      fn()
    );
    taskRunnerFactoryInitializerParams.getRulesSettingsClientWithRequest.mockReturnValue(
      rulesSettingsClientMock.create()
    );
    taskRunnerFactoryInitializerParams.getMaintenanceWindowClientWithRequest.mockReturnValue(
      maintenanceWindowClient
    );
    mockedRuleTypeSavedObject.monitoring!.run.history = [];
    mockedRuleTypeSavedObject.monitoring!.run.calculated_metrics.success_ratio = 0;

    alertingEventLogger.getStartAndDuration.mockImplementation(() => ({ start: new Date() }));
    (AlertingEventLogger as jest.Mock).mockImplementation(() => alertingEventLogger);
    logger.get.mockImplementation(() => logger);
    ruleType.executor.mockResolvedValue({ state: {} });
  });

  test('should not use legacy alerts client if alerts client created', async () => {
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => mockLegacyAlertsClient);
    const spy2 = jest
      .spyOn(RuleRunMetricsStoreModule, 'RuleRunMetricsStore')
      .mockImplementation(() => ruleRunMetricsStore);
    mockAlertsService.createAlertsClient.mockImplementation(() => mockAlertsClient);
    mockAlertsClient.getAlertsToSerialize.mockResolvedValue({
      alertsToReturn: {},
      recoveredAlertsToReturn: {},
    });
    ruleRunMetricsStore.getMetrics.mockReturnValue({
      numSearches: 3,
      totalSearchDurationMs: 23423,
      esSearchDurationMs: 33,
      numberOfTriggeredActions: 0,
      numberOfGeneratedActions: 0,
      numberOfActiveAlerts: 0,
      numberOfRecoveredAlerts: 0,
      numberOfNewAlerts: 0,
      hasReachedAlertLimit: false,
      triggeredActionsStatus: 'complete',
    });
    const taskRunner = new TaskRunner({
      ruleType: ruleTypeWithAlerts,
      taskInstance: {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      context: taskRunnerFactoryInitializerParams,
      inMemoryMetrics,
    });
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(mockedRawRuleSO);

    await taskRunner.run();

    expect(mockAlertsService.createAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
      namespace: 'default',
      rule: {
        consumer: 'bar',
        executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
        id: '1',
        name: 'rule-name',
        parameters: {
          bar: true,
        },
        revision: 0,
        spaceId: 'default',
        tags: ['rule-', '-tags'],
      },
    });
    expect(LegacyAlertsClientModule.LegacyAlertsClient).not.toHaveBeenCalled();

    testCorrectAlertsClientUsed({
      alertsClientToUse: mockAlertsClient,
      alertsClientNotToUse: mockLegacyAlertsClient,
    });

    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );
    expect(logger.debug).nthCalledWith(
      3,
      'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeOrder":0,"outcomeMsg":null,"warning":null,"alertsCount":{"active":0,"new":0,"recovered":0,"ignored":0}}'
    );
    expect(logger.debug).nthCalledWith(
      4,
      'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":0,"numberOfGeneratedActions":0,"numberOfActiveAlerts":0,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":0,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
    );

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({}));

    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toBeCalledTimes(1);
    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toHaveBeenCalledWith(
      {
        id: '1',
        name: 'execute test',
        type: 'alert',
        description: 'execute [test] with name [rule-name] in [default] namespace',
      },
      expect.any(Function)
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(
      jest.requireMock('../lib/wrap_scoped_cluster_client').createWrappedScopedClusterClientFactory
    ).toHaveBeenCalled();
    spy1.mockRestore();
    spy2.mockRestore();
  });

  test('should successfully execute task with alerts client', async () => {
    const alertsService = new AlertsService({
      logger,
      pluginStop$: new ReplaySubject(1),
      kibanaVersion: '8.8.0',
      elasticsearchClientPromise: Promise.resolve(clusterClient),
    });
    const spy = jest
      .spyOn(alertsService, 'getContextInitializationPromise')
      .mockResolvedValue({ result: true });

    const taskRunner = new TaskRunner({
      ruleType: ruleTypeWithAlerts,
      taskInstance: {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      context: {
        ...taskRunnerFactoryInitializerParams,
        alertsService,
      },
      inMemoryMetrics,
    });
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);
    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(mockedRawRuleSO);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ state: true, history: [true] }));

    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    const call = ruleType.executor.mock.calls[0][0];
    expect(call.params).toEqual({ bar: true });
    expect(call.startedAt).toStrictEqual(new Date(DATE_1970));
    expect(call.previousStartedAt).toStrictEqual(new Date(DATE_1970_5_MIN));
    expect(call.state).toEqual({});
    expect(call.rule).not.toBe(null);
    expect(call.rule.id).toBe('1');
    expect(call.rule.name).toBe(RULE_NAME);
    expect(call.rule.tags).toEqual(['rule-', '-tags']);
    expect(call.rule.consumer).toBe('bar');
    expect(call.rule.enabled).toBe(true);
    expect(call.rule.schedule).toEqual({ interval: '10s' });
    expect(call.rule.createdBy).toBe('rule-creator');
    expect(call.rule.updatedBy).toBe('rule-updater');
    expect(call.rule.createdAt).toBe(mockDate);
    expect(call.rule.updatedAt).toBe(mockDate);
    expect(call.rule.notifyWhen).toBe('onActiveAlert');
    expect(call.rule.throttle).toBe(null);
    expect(call.rule.producer).toBe('alerts');
    expect(call.rule.ruleTypeId).toBe('test');
    expect(call.rule.ruleTypeName).toBe('My test rule');
    expect(call.rule.actions).toEqual(RULE_ACTIONS);
    expect(call.services.alertFactory.create).toBeTruthy();
    expect(call.services.alertsClient).not.toBe(null);
    expect(call.services.alertsClient?.report).toBeTruthy();
    expect(call.services.alertsClient?.setAlertData).toBeTruthy();
    expect(call.services.scopedClusterClient).toBeTruthy();
    expect(call.services).toBeTruthy();
    expect(logger.debug).toHaveBeenCalledTimes(6);
    expect(logger.debug).nthCalledWith(1, `Initializing resources for AlertsService`);
    expect(logger.debug).nthCalledWith(2, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      3,
      'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );
    expect(logger.debug).nthCalledWith(
      4,
      'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeOrder":0,"outcomeMsg":null,"warning":null,"alertsCount":{"active":0,"new":0,"recovered":0,"ignored":0}}'
    );
    expect(logger.debug).nthCalledWith(
      5,
      'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":0,"numberOfGeneratedActions":0,"numberOfActiveAlerts":0,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":0,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
    );
    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({}));
    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toBeCalledTimes(1);
    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toHaveBeenCalledWith(
      {
        id: '1',
        name: 'execute test',
        type: 'alert',
        description: 'execute [test] with name [rule-name] in [default] namespace',
      },
      expect.any(Function)
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(
      jest.requireMock('../lib/wrap_scoped_cluster_client').createWrappedScopedClusterClientFactory
    ).toHaveBeenCalled();
    spy.mockRestore();
  });

  test('should successfully execute task and index alert documents', async () => {
    const alertsService = new AlertsService({
      logger,
      pluginStop$: new ReplaySubject(1),
      kibanaVersion: '8.8.0',
      elasticsearchClientPromise: Promise.resolve(clusterClient),
    });
    const spy = jest
      .spyOn(alertsService, 'getContextInitializationPromise')
      .mockResolvedValue({ result: true });

    ruleTypeWithAlerts.executor.mockImplementation(
      async ({
        services: executorServices,
      }: RuleExecutorOptions<
        RuleTypeParams,
        RuleTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string,
        RuleAlertData
      >) => {
        executorServices.alertsClient?.report({
          id: '1',
          actionGroup: 'default',
          payload: { textField: 'foo', numericField: 27 },
        });
        return { state: {} };
      }
    );

    const taskRunner = new TaskRunner({
      ruleType: ruleTypeWithAlerts,
      taskInstance: mockedTaskInstance,
      context: {
        ...taskRunnerFactoryInitializerParams,
        alertsService,
      },
      inMemoryMetrics,
    });
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);
    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(mockedRawRuleSO);
    await taskRunner.run();

    expect(ruleType.executor).toHaveBeenCalledTimes(1);

    expect(clusterClient.bulk).toHaveBeenCalledWith({
      index: '.alerts-test.alerts-default',
      refresh: 'wait_for',
      require_alias: true,
      body: [
        { index: { _id: '5f6aa57d-3e22-484e-bae8-cbed868f4d28' } },
        // new alert doc
        {
          '@timestamp': DATE_1970,
          event: {
            action: 'open',
            kind: 'signal',
          },
          kibana: {
            alert: {
              action_group: 'default',
              duration: {
                us: '0',
              },
              flapping: false,
              flapping_history: [true],
              instance: {
                id: '1',
              },
              maintenance_window_ids: [],
              rule: {
                category: 'My test rule',
                consumer: 'bar',
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
                name: 'rule-name',
                parameters: {
                  bar: true,
                },
                producer: 'alerts',
                revision: 0,
                rule_type_id: 'test',
                tags: ['rule-', '-tags'],
                uuid: '1',
              },
              start: DATE_1970,
              status: 'active',
              time_range: {
                gte: DATE_1970,
              },
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
              workflow_status: 'open',
            },
            space_ids: ['default'],
            version: '8.8.0',
          },
          numericField: 27,
          textField: 'foo',
          tags: ['rule-', '-tags'],
        },
      ],
    });
    spy.mockRestore();
  });

  test('should default to legacy alerts client if error creating alerts client', async () => {
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => mockLegacyAlertsClient);
    const spy2 = jest
      .spyOn(RuleRunMetricsStoreModule, 'RuleRunMetricsStore')
      .mockImplementation(() => ruleRunMetricsStore);
    mockAlertsService.createAlertsClient.mockImplementation(() => {
      throw new Error('Could not initialize!');
    });
    mockLegacyAlertsClient.getAlertsToSerialize.mockResolvedValue({
      alertsToReturn: {},
      recoveredAlertsToReturn: {},
    });
    ruleRunMetricsStore.getMetrics.mockReturnValue({
      numSearches: 3,
      totalSearchDurationMs: 23423,
      esSearchDurationMs: 33,
      numberOfTriggeredActions: 0,
      numberOfGeneratedActions: 0,
      numberOfActiveAlerts: 0,
      numberOfRecoveredAlerts: 0,
      numberOfNewAlerts: 0,
      hasReachedAlertLimit: false,
      triggeredActionsStatus: 'complete',
    });
    const taskRunner = new TaskRunner({
      ruleType: ruleTypeWithAlerts,
      taskInstance: {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      context: taskRunnerFactoryInitializerParams,
      inMemoryMetrics,
    });
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(mockedRawRuleSO);

    await taskRunner.run();

    expect(mockAlertsService.createAlertsClient).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      `Error initializing AlertsClient for context test. Using legacy alerts client instead. - Could not initialize!`
    );
    expect(LegacyAlertsClientModule.LegacyAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
    });

    testCorrectAlertsClientUsed({
      alertsClientToUse: mockLegacyAlertsClient,
      alertsClientNotToUse: mockAlertsClient,
    });

    expect(ruleType.executor).toHaveBeenCalledTimes(1);

    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({}));

    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toBeCalledTimes(1);
    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toHaveBeenCalledWith(
      {
        id: '1',
        name: 'execute test',
        type: 'alert',
        description: 'execute [test] with name [rule-name] in [default] namespace',
      },
      expect.any(Function)
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(
      jest.requireMock('../lib/wrap_scoped_cluster_client').createWrappedScopedClusterClientFactory
    ).toHaveBeenCalled();
    spy1.mockRestore();
    spy2.mockRestore();
  });

  test('should default to legacy alerts client if alert service is not defined', async () => {
    const spy1 = jest
      .spyOn(LegacyAlertsClientModule, 'LegacyAlertsClient')
      .mockImplementation(() => mockLegacyAlertsClient);
    const spy2 = jest
      .spyOn(RuleRunMetricsStoreModule, 'RuleRunMetricsStore')
      .mockImplementation(() => ruleRunMetricsStore);
    mockLegacyAlertsClient.getAlertsToSerialize.mockResolvedValue({
      alertsToReturn: {},
      recoveredAlertsToReturn: {},
    });
    ruleRunMetricsStore.getMetrics.mockReturnValue({
      numSearches: 3,
      totalSearchDurationMs: 23423,
      esSearchDurationMs: 33,
      numberOfTriggeredActions: 0,
      numberOfGeneratedActions: 0,
      numberOfActiveAlerts: 0,
      numberOfRecoveredAlerts: 0,
      numberOfNewAlerts: 0,
      hasReachedAlertLimit: false,
      triggeredActionsStatus: 'complete',
    });
    const taskRunner = new TaskRunner({
      ruleType: ruleTypeWithAlerts,
      taskInstance: {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      context: { ...taskRunnerFactoryInitializerParams, alertsService: null },
      inMemoryMetrics,
    });
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(mockedRawRuleSO);

    await taskRunner.run();

    expect(mockAlertsService.createAlertsClient).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(LegacyAlertsClientModule.LegacyAlertsClient).toHaveBeenCalledWith({
      logger,
      ruleType: ruleTypeWithAlerts,
    });

    testCorrectAlertsClientUsed({
      alertsClientToUse: mockLegacyAlertsClient,
      alertsClientNotToUse: mockAlertsClient,
    });

    expect(ruleType.executor).toHaveBeenCalledTimes(1);

    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({}));

    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toBeCalledTimes(1);
    expect(taskRunnerFactoryInitializerParams.executionContext.withContext).toHaveBeenCalledWith(
      {
        id: '1',
        name: 'execute test',
        type: 'alert',
        description: 'execute [test] with name [rule-name] in [default] namespace',
      },
      expect.any(Function)
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(
      jest.requireMock('../lib/wrap_scoped_cluster_client').createWrappedScopedClusterClientFactory
    ).toHaveBeenCalled();
    spy1.mockRestore();
    spy2.mockRestore();
  });

  function testCorrectAlertsClientUsed<
    AlertData extends RuleAlertData = never,
    State extends AlertInstanceState = never,
    Context extends AlertInstanceContext = never,
    ActionGroupIds extends string = 'default',
    RecoveryActionGroupId extends string = 'recovered'
  >({
    alertsClientToUse,
    alertsClientNotToUse,
  }: {
    alertsClientToUse: IAlertsClient<
      AlertData,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >;
    alertsClientNotToUse: IAlertsClient<
      AlertData,
      State,
      Context,
      ActionGroupIds,
      RecoveryActionGroupId
    >;
  }) {
    expect(alertsClientToUse.initializeExecution).toHaveBeenCalledWith({
      activeAlertsFromState: {},
      flappingSettings: {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
      maxAlerts: 1000,
      recoveredAlertsFromState: {},
      ruleLabel: "test:1: 'rule-name'",
    });
    expect(alertsClientNotToUse.initializeExecution).not.toHaveBeenCalled();

    expect(alertsClientToUse.checkLimitUsage).toHaveBeenCalled();
    expect(alertsClientNotToUse.checkLimitUsage).not.toHaveBeenCalled();

    expect(alertsClientToUse.processAndLogAlerts).toHaveBeenCalledWith({
      eventLogger: alertingEventLogger,
      ruleRunMetricsStore,
      shouldLogAlerts: true,
      flappingSettings: {
        enabled: true,
        lookBackWindow: 20,
        statusChangeThreshold: 4,
      },
      notifyWhen: RuleNotifyWhen.ACTIVE,
      maintenanceWindowIds: [],
    });
    expect(alertsClientNotToUse.processAndLogAlerts).not.toHaveBeenCalled();

    expect(alertsClientToUse.persistAlerts).toHaveBeenCalled();
    expect(alertsClientNotToUse.persistAlerts).not.toHaveBeenCalled();

    expect(alertsClientToUse.getProcessedAlerts).toHaveBeenCalledWith('activeCurrent');
    expect(alertsClientToUse.getProcessedAlerts).toHaveBeenCalledWith('recoveredCurrent');
    expect(alertsClientNotToUse.getProcessedAlerts).not.toHaveBeenCalled();

    expect(alertsClientToUse.getAlertsToSerialize).toHaveBeenCalled();
    expect(alertsClientNotToUse.getAlertsToSerialize).not.toHaveBeenCalled();
  }
});

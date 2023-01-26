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
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import {
  AlertingEventLogger,
  RuleContextOpts,
} from '../lib/alerting_event_logger/alerting_event_logger';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import {
  mockTaskInstance,
  ruleType,
  mockedRuleTypeSavedObject,
  generateAlertOpts,
  DATE_1970,
  generateActionOpts,
} from './fixtures';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
}));
jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn(),
}));

jest.mock('../lib/alerting_event_logger/alerting_event_logger');

let fakeTimer: sinon.SinonFakeTimers;

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
const alertingEventLogger = alertingEventLoggerMock.create();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const dataViewsMock = {
  dataViewsServiceFactory: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
} as DataViewsServerPluginStart;

describe('Task Runner Cancel', () => {
  let mockedTaskInstance: ConcreteTaskInstance;
  let alertingEventLoggerInitializer: RuleContextOpts;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = mockTaskInstance();

    alertingEventLoggerInitializer = {
      consumer: mockedTaskInstance.params.consumer,
      executionId: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
      ruleId: mockedTaskInstance.params.alertId,
      ruleType,
      spaceId: mockedTaskInstance.params.spaceId,
      taskScheduledAt: mockedTaskInstance.scheduledAt,
    };
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
  const services = alertsMock.createRuleExecutorServices();
  const actionsClient = actionsClientMock.create();
  const rulesClient = rulesClientMock.create();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
  const elasticsearchService = elasticsearchServiceMock.createInternalStart();
  const uiSettingsService = uiSettingsServiceMock.createStartContract();
  const dataPlugin = dataPluginMock.createStartContract();
  const inMemoryMetrics = inMemoryMetricsMock.create();

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
    alertsService: null,
    kibanaBaseUrl: 'https://localhost:5601',
    supportsEphemeralTasks: false,
    maxEphemeralActionsPerRule: 10,
    maxAlerts: 1000,
    cancelAlertsOnRuleTimeout: true,
    usageCounter: mockUsageCounter,
    actionsConfigMap: {
      default: {
        max: 1000,
      },
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
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
    taskRunnerFactoryInitializerParams.getRulesClientWithRequest.mockReturnValue(rulesClient);
    taskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest.mockResolvedValue(
      actionsClient
    );
    taskRunnerFactoryInitializerParams.actionsPlugin.renderActionParameterTemplates.mockImplementation(
      (actionTypeId, actionId, params) => params
    );
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    taskRunnerFactoryInitializerParams.executionContext.withContext.mockImplementation((ctx, fn) =>
      fn()
    );
    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
        consumer: 'bar',
      },
      references: [],
    });
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertingEventLogger.getStartAndDuration.mockImplementation(() => ({ start: new Date() }));
    (AlertingEventLogger as jest.Mock).mockImplementation(() => alertingEventLogger);
    logger.get.mockImplementation(() => logger);
  });

  test('updates rule saved object execution status and writes to event log entry when task is cancelled mid-execution', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    expect(logger.debug).toHaveBeenNthCalledWith(
      3,
      `Aborting any in-progress ES searches for rule type test with id 1`
    );

    testAlertingEventLogCalls({ status: 'ok' });

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledTimes(1);
    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        executionStatus: {
          error: {
            message: `test:1: execution cancelled due to timeout - exceeded rule type timeout of 5m`,
            reason: 'timeout',
          },
          lastDuration: 0,
          lastExecutionDate: '1970-01-01T00:00:00.000Z',
          status: 'error',
          warning: null,
        },
        lastRun: {
          alertsCount: {},
          outcome: 'failed',
          outcomeMsg: [
            'test:1: execution cancelled due to timeout - exceeded rule type timeout of 5m',
          ],
          warning: 'timeout',
        },
        monitoring: {
          run: {
            calculated_metrics: {
              success_ratio: 0,
            },
            history: [],
            last_run: {
              metrics: {
                gap_duration_s: null,
                total_alerts_created: null,
                total_alerts_detected: null,
                total_indexing_duration_ms: null,
                total_search_duration_ms: null,
              },
              timestamp: '1970-01-01T00:00:00.000Z',
            },
          },
        },
        nextRun: '1970-01-01T00:00:10.000Z',
        running: false,
      },
      { refresh: false, namespace: undefined }
    );
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'alertsSkippedDueToRuleExecutionTimeout_test',
      incrementBy: 1,
    });
  });

  test('actionsPlugin.execute is called if rule execution is cancelled but cancelAlertsOnRuleTimeout from config is false', async () => {
    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: RuleExecutorOptions<
        RuleTypeParams,
        RuleTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
        return { state: {} };
      }
    );
    // setting cancelAlertsOnRuleTimeout to false here
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      {
        ...taskRunnerFactoryInitializerParams,
        cancelAlertsOnRuleTimeout: false,
      },
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testLogger();
    testAlertingEventLogCalls({
      status: 'active',
      newAlerts: 1,
      activeAlerts: 1,
      generatedActions: 1,
      triggeredActions: 1,
      logAction: 1,
      logAlert: 2,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.newInstance,
        group: 'default',
        state: { start: DATE_1970, duration: '0' },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { start: DATE_1970, duration: '0' },
      })
    );
    expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(1, generateActionOpts({}));

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('actionsPlugin.execute is called if rule execution is cancelled but cancelAlertsOnRuleTimeout for ruleType is false', async () => {
    const updatedRuleType = {
      ...ruleType,
      cancelAlertsOnRuleTimeout: false,
    };
    ruleTypeRegistry.get.mockReturnValue(updatedRuleType);
    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: RuleExecutorOptions<
        RuleTypeParams,
        RuleTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
        return { state: {} };
      }
    );
    // setting cancelAlertsOnRuleTimeout for ruleType to false here
    const taskRunner = new TaskRunner(
      updatedRuleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testLogger();
    testAlertingEventLogCalls({
      ruleContext: { ...alertingEventLoggerInitializer, ruleType: updatedRuleType },
      status: 'active',
      activeAlerts: 1,
      generatedActions: 1,
      newAlerts: 1,
      triggeredActions: 1,
      logAlert: 2,
      logAction: 1,
    });

    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.newInstance,
        group: 'default',
        state: { start: DATE_1970, duration: '0' },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { start: DATE_1970, duration: '0' },
      })
    );
    expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(1, generateActionOpts({}));

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('actionsPlugin.execute is skipped if rule execution is cancelled and cancelAlertsOnRuleTimeout for both config and ruleType are true', async () => {
    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: RuleExecutorOptions<
        RuleTypeParams,
        RuleTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
        return { state: {} };
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testAlertingEventLogCalls({
      status: 'active',
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'alertsSkippedDueToRuleExecutionTimeout_test',
      incrementBy: 1,
    });
  });

  function testLogger() {
    expect(logger.debug).toHaveBeenCalledTimes(8);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `Cancelling rule type test with id 1 - execution exceeded rule type timeout of 5m`
    );
    expect(logger.debug).nthCalledWith(
      3,
      'Aborting any in-progress ES searches for rule type test with id 1'
    );
    expect(logger.debug).nthCalledWith(
      4,
      `Updating rule task for test rule with id 1 - execution error due to timeout`
    );
    expect(logger.debug).nthCalledWith(
      5,
      `rule test:1: 'rule-name' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      6,
      'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );
    expect(logger.debug).nthCalledWith(
      8,
      'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":1,"numberOfGeneratedActions":1,"numberOfActiveAlerts":1,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":1,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
    );
  }

  function testAlertingEventLogCalls({
    ruleContext = alertingEventLoggerInitializer,
    activeAlerts = 0,
    newAlerts = 0,
    recoveredAlerts = 0,
    triggeredActions = 0,
    generatedActions = 0,
    status,
    logAlert = 0,
    logAction = 0,
    hasReachedAlertLimit = false,
  }: {
    status: string;
    ruleContext?: RuleContextOpts;
    activeAlerts?: number;
    newAlerts?: number;
    recoveredAlerts?: number;
    triggeredActions?: number;
    generatedActions?: number;
    setRuleName?: boolean;
    logAlert?: number;
    logAction?: number;
    hasReachedAlertLimit?: boolean;
  }) {
    expect(alertingEventLogger.initialize).toHaveBeenCalledWith(ruleContext);
    expect(alertingEventLogger.start).toHaveBeenCalled();
    expect(alertingEventLogger.setRuleName).toHaveBeenCalledWith(mockedRuleTypeSavedObject.name);
    expect(alertingEventLogger.getStartAndDuration).toHaveBeenCalled();

    expect(alertingEventLogger.done).toHaveBeenCalledWith({
      metrics: {
        esSearchDurationMs: 33,
        numSearches: 3,
        numberOfActiveAlerts: activeAlerts,
        numberOfGeneratedActions: generatedActions,
        numberOfNewAlerts: newAlerts,
        numberOfRecoveredAlerts: recoveredAlerts,
        numberOfTriggeredActions: triggeredActions,
        totalSearchDurationMs: 23423,
        hasReachedAlertLimit,
        triggeredActionsStatus: 'complete',
      },
      status: {
        lastExecutionDate: new Date('1970-01-01T00:00:00.000Z'),
        status,
      },
      timings: {
        claim_to_start_duration_ms: 0,
        prepare_rule_duration_ms: 0,
        process_alerts_duration_ms: 0,
        process_rule_duration_ms: 0,
        rule_type_run_duration_ms: 0,
        total_run_duration_ms: 0,
        trigger_actions_duration_ms: 0,
      },
    });

    expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
      `rule executed: test:1: 'rule-name'`
    );
    expect(alertingEventLogger.setExecutionFailed).not.toHaveBeenCalled();

    if (logAlert > 0) {
      expect(alertingEventLogger.logAlert).toHaveBeenCalledTimes(logAlert);
    } else {
      expect(alertingEventLogger.logAlert).not.toHaveBeenCalled();
    }

    if (logAction > 0) {
      expect(alertingEventLogger.logAction).toHaveBeenCalledTimes(logAction);
    } else {
      expect(alertingEventLogger.logAction).not.toHaveBeenCalled();
    }
    expect(alertingEventLogger.logTimeout).toHaveBeenCalled();
  }
});

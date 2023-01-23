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
  RuleExecutionStatusWarningReasons,
  Rule,
  RuleAction,
} from '../types';
import { ConcreteTaskInstance, isUnrecoverableError } from '@kbn/task-manager-plugin/server';
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
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { omit } from 'lodash';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';
import moment from 'moment';
import {
  generateAlertOpts,
  generateActionOpts,
  mockDate,
  mockedRuleTypeSavedObject,
  mockRunNowResponse,
  ruleType,
  RULE_NAME,
  SAVED_OBJECT,
  generateRunnerResult,
  RULE_ACTIONS,
  generateEnqueueFunctionInput,
  generateSavedObjectParams,
  mockTaskInstance,
  GENERIC_ERROR_MESSAGE,
  generateAlertInstance,
  MOCK_DURATION,
  DATE_1969,
  DATE_1970,
  DATE_1970_5_MIN,
  DATE_9999,
  getSummarizedAlertsMock,
  mockAAD,
} from './fixtures';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { IN_MEMORY_METRICS } from '../monitoring';
import { translations } from '../constants/translations';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import {
  AlertingEventLogger,
  RuleContextOpts,
} from '../lib/alerting_event_logger/alerting_event_logger';
import { alertingEventLoggerMock } from '../lib/alerting_event_logger/alerting_event_logger.mock';
import { SharePluginStart } from '@kbn/share-plugin/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { alertsServiceMock } from '../alerts_service/alerts_service.mock';

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

describe('Task Runner', () => {
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
  const mockAlertService = alertsServiceMock.create();
  const elasticsearchService = elasticsearchServiceMock.createInternalStart();
  const dataPlugin = dataPluginMock.createStartContract();
  const uiSettingsService = uiSettingsServiceMock.createStartContract();
  const inMemoryMetrics = inMemoryMetricsMock.create();
  const dataViewsMock = {
    dataViewsServiceFactory: jest.fn().mockResolvedValue(dataViewPluginMocks.createStartContract()),
  } as DataViewsServerPluginStart;

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
    alertsService: mockAlertService,
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
  };

  const ephemeralTestParams: Array<
    [
      nameExtension: string,
      customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
      enqueueFunction: unknown,
      isBulk: boolean
    ]
  > = [
    ['', taskRunnerFactoryInitializerParams, actionsClient.bulkEnqueueExecution, true],
    [
      ' (with ephemeral support)',
      {
        ...taskRunnerFactoryInitializerParams,
        supportsEphemeralTasks: true,
      },
      actionsClient.ephemeralEnqueuedExecution,
      false,
    ],
  ];

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
    mockedRuleTypeSavedObject.monitoring!.run.history = [];
    mockedRuleTypeSavedObject.monitoring!.run.calculated_metrics.success_ratio = 0;

    alertingEventLogger.getStartAndDuration.mockImplementation(() => ({ start: new Date() }));
    (AlertingEventLogger as jest.Mock).mockImplementation(() => alertingEventLogger);
    logger.get.mockImplementation(() => logger);

    ruleType.executor.mockResolvedValue({ state: {} });
  });

  test('successfully executes the task', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
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
    expect(call.services.scopedClusterClient).toBeTruthy();
    expect(call.services).toBeTruthy();

    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );
    expect(logger.debug).nthCalledWith(
      3,
      'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":0,"new":0,"recovered":0,"ignored":0}}'
    );
    expect(logger.debug).nthCalledWith(
      4,
      'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":0,"numberOfGeneratedActions":0,"numberOfActiveAlerts":0,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":0,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
    );

    testAlertingEventLogCalls({ status: 'ok' });

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
  });

  test.each(ephemeralTestParams)(
    'actionsPlugin.execute is called per alert alert that is scheduled %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);
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
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(enqueueFunction).toHaveBeenCalledWith(
        generateEnqueueFunctionInput({ isBulk, id: '1', foo: true })
      );

      expect(logger.debug).toHaveBeenCalledTimes(6);
      expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
      expect(logger.debug).nthCalledWith(
        2,
        `rule test:1: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
      );
      expect(logger.debug).nthCalledWith(
        3,
        'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
      );
      expect(logger.debug).nthCalledWith(
        4,
        'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":1,"new":1,"recovered":0,"ignored":0}}'
      );
      expect(logger.debug).nthCalledWith(
        5,
        'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":1,"numberOfGeneratedActions":1,"numberOfActiveAlerts":1,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":1,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
      );

      testAlertingEventLogCalls({
        activeAlerts: 1,
        generatedActions: 1,
        newAlerts: 1,
        triggeredActions: 1,
        status: 'active',
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
      expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(1, generateActionOpts());

      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test('actionsPlugin.execute is skipped if muteAll is true', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      muteAll: true,
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();
    expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

    expect(logger.debug).toHaveBeenCalledTimes(7);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `rule test:1: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `no scheduling of actions for rule test:1: '${RULE_NAME}': rule is snoozed.`
    );
    expect(logger.debug).nthCalledWith(
      4,
      'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );
    expect(logger.debug).nthCalledWith(
      5,
      'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":1,"new":1,"recovered":0,"ignored":0}}'
    );
    expect(logger.debug).nthCalledWith(
      6,
      'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":0,"numberOfGeneratedActions":0,"numberOfActiveAlerts":1,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":1,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
    );

    testAlertingEventLogCalls({
      activeAlerts: 1,
      newAlerts: 1,
      status: 'active',
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

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  type SnoozeTestParams = [
    muteAll: boolean,
    snoozeEndTime: string | undefined | null,
    shouldBeSnoozed: boolean
  ];

  const snoozeTestParams: SnoozeTestParams[] = [
    [false, null, false],
    [false, undefined, false],
    // Stringify the snooze schedules for better failure reporting
    [
      false,
      JSON.stringify([
        { rRule: { dtstart: DATE_9999, tzid: 'UTC', count: 1 }, duration: 100000000 },
      ]),
      false,
    ],
    [
      false,
      JSON.stringify([
        { rRule: { dtstart: DATE_1970, tzid: 'UTC', count: 1 }, duration: 100000000 },
      ]),
      true,
    ],
    [true, null, true],
    [true, undefined, true],
    [
      true,
      JSON.stringify([
        { rRule: { dtstart: DATE_9999, tzid: 'UTC', count: 1 }, duration: 100000000 },
      ]),
      true,
    ],
    [
      true,
      JSON.stringify([
        { rRule: { dtstart: DATE_1970, tzid: 'UTC', count: 1 }, duration: 100000000 },
      ]),
      true,
    ],
  ];

  test.each(snoozeTestParams)(
    'snoozing works as expected with muteAll: %s; snoozeSchedule: %s',
    async (muteAll, snoozeSchedule, shouldBeSnoozed) => {
      taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
      taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        muteAll,
        snoozeSchedule: snoozeSchedule != null ? JSON.parse(snoozeSchedule) : [],
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();

      const expectedExecutions = shouldBeSnoozed ? 0 : 1;
      expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(expectedExecutions);
      expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

      const expectedMessage = `no scheduling of actions for rule test:1: '${RULE_NAME}': rule is snoozed.`;
      if (expectedExecutions) {
        expect(logger.debug).not.toHaveBeenCalledWith(expectedMessage);
      } else {
        expect(logger.debug).toHaveBeenCalledWith(expectedMessage);
      }
    }
  );

  test.each(ephemeralTestParams)(
    'skips firing actions for active alert if alert is muted %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
      (
        customTaskRunnerFactoryInitializerParams as TaskRunnerFactoryInitializerParamsType
      ).actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);
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
          executorServices.alertFactory.create('2').scheduleActions('default');
          return { state: {} };
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        mutedInstanceIds: ['2'],
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(enqueueFunction).toHaveBeenCalledTimes(1);

      expect(logger.debug).toHaveBeenCalledTimes(7);
      expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
      expect(logger.debug).nthCalledWith(
        2,
        `rule test:1: '${RULE_NAME}' has 2 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"}]`
      );
      expect(logger.debug).nthCalledWith(
        3,
        `skipping scheduling of actions for '2' in rule test:1: '${RULE_NAME}': rule is muted`
      );
      expect(logger.debug).nthCalledWith(
        4,
        'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
      );
      expect(logger.debug).nthCalledWith(
        5,
        'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":2,"new":2,"recovered":0,"ignored":0}}'
      );
      expect(logger.debug).nthCalledWith(
        6,
        'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":1,"numberOfGeneratedActions":1,"numberOfActiveAlerts":2,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":2,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'skips firing actions for active alert if alert is throttled %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
      (
        customTaskRunnerFactoryInitializerParams as TaskRunnerFactoryInitializerParamsType
      ).actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);
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
          executorServices.alertFactory.create('2').scheduleActions('default');
          return { state: {} };
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        {
          ...mockedTaskInstance,
          state: {
            ...mockedTaskInstance.state,
            alertInstances: {
              '2': {
                meta: {
                  lastScheduledActions: { date: moment().toISOString(), group: 'default' },
                },
                state: {
                  bar: false,
                  start: DATE_1969,
                  duration: MOCK_DURATION,
                },
              },
            },
          },
        },
        taskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        notifyWhen: 'onThrottleInterval',
        throttle: '1d',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      // expect(enqueueFunction).toHaveBeenCalledTimes(1);

      // expect(logger.debug).toHaveBeenCalledTimes(5);
      expect(logger.debug).nthCalledWith(
        3,
        `skipping scheduling of actions for '2' in rule test:1: '${RULE_NAME}': rule is throttled`
      );
    }
  );

  test.each(ephemeralTestParams)(
    'skips firing actions for active alert when alert is muted even if notifyWhen === onActionGroupChange %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
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
          executorServices.alertFactory.create('2').scheduleActions('default');
          return { state: {} };
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        mutedInstanceIds: ['2'],
        notifyWhen: 'onActionGroupChange',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledTimes(7);
      expect(logger.debug).nthCalledWith(
        3,
        `skipping scheduling of actions for '2' in rule test:1: '${RULE_NAME}': rule is muted`
      );
    }
  );

  test('actionsPlugin.execute is not called when notifyWhen=onActionGroupChange and alert state does not change', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: {
                lastScheduledActions: { date: DATE_1970, group: 'default' },
              },
              state: {
                bar: false,
                start: DATE_1969,
                duration: MOCK_DURATION,
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      notifyWhen: 'onActionGroupChange',
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();
    expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

    testAlertingEventLogCalls({
      activeAlerts: 1,
      status: 'active',
      logAlert: 1,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { start: DATE_1969, duration: MOCK_DURATION, bar: false },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test.each(ephemeralTestParams)(
    'actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert state has changed %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
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
        {
          ...mockedTaskInstance,
          state: {
            ...mockedTaskInstance.state,
            alertInstances: {
              '1': {
                meta: {
                  lastScheduledActions: { group: 'newGroup', date: new Date().toISOString() },
                },
                state: { bar: false },
              },
            },
          },
        },
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        notifyWhen: 'onActionGroupChange',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

      await taskRunner.run();

      testAlertingEventLogCalls({
        activeAlerts: 1,
        triggeredActions: 1,
        generatedActions: 1,
        status: 'active',
        logAlert: 1,
        logAction: 1,
      });
      expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
        1,
        generateAlertOpts({
          action: EVENT_LOG_ACTIONS.activeInstance,
          group: 'default',
          state: { bar: false },
        })
      );
      expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(1, generateActionOpts({}));

      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'includes the apiKey in the request used to initialize the actionsClient %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);
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
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalled();

      rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(
        customTaskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            // base64 encoded "123:abc"
            authorization: 'ApiKey MTIzOmFiYw==',
          },
        })
      );

      const [request] =
        customTaskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest.mock
          .calls[0];

      expect(customTaskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
        request,
        '/'
      );

      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(enqueueFunction).toHaveBeenCalledWith(
        generateEnqueueFunctionInput({ isBulk, id: '1', foo: true })
      );

      testAlertingEventLogCalls({
        activeAlerts: 1,
        newAlerts: 1,
        triggeredActions: 1,
        generatedActions: 1,
        status: 'active',
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
    }
  );

  test.each(ephemeralTestParams)(
    'fire recovered actions for execution for the alertInstances which is in the recovered state %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);

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
        {
          ...mockedTaskInstance,
          state: {
            ...mockedTaskInstance.state,
            alertInstances: {
              '1': {
                meta: {},
                state: {
                  bar: false,
                  start: DATE_1969,
                  duration: '80000000000',
                },
              },
              '2': {
                meta: {},
                state: {
                  bar: false,
                  start: '1969-12-31T06:00:00.000Z',
                  duration: '70000000000',
                },
              },
            },
          },
        },
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalled();

      rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const runnerResult = await taskRunner.run();
      expect(runnerResult.state.alertInstances).toEqual(
        generateAlertInstance({
          id: 1,
          duration: MOCK_DURATION,
          start: DATE_1969,
          flappingHistory: [false],
        })
      );

      expect(logger.debug).toHaveBeenCalledTimes(7);
      expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
      expect(logger.debug).nthCalledWith(
        2,
        `rule test:1: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
      );
      expect(logger.debug).nthCalledWith(
        3,
        `rule test:1: '${RULE_NAME}' has 1 recovered alerts: [\"2\"]`
      );
      expect(logger.debug).nthCalledWith(
        4,
        'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
      );
      expect(logger.debug).nthCalledWith(
        5,
        'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":1,"new":0,"recovered":1,"ignored":0}}'
      );
      expect(logger.debug).nthCalledWith(
        6,
        'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":2,"numberOfGeneratedActions":2,"numberOfActiveAlerts":1,"numberOfRecoveredAlerts":1,"numberOfNewAlerts":0,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
      );

      testAlertingEventLogCalls({
        activeAlerts: 1,
        recoveredAlerts: 1,
        triggeredActions: 2,
        generatedActions: 2,
        status: 'active',
        logAlert: 2,
        logAction: 2,
      });
      expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
        1,
        generateAlertOpts({
          action: EVENT_LOG_ACTIONS.recoveredInstance,
          id: '2',
          state: {
            bar: false,
            start: '1969-12-31T06:00:00.000Z',
            duration: '64800000000000',
            end: DATE_1970,
          },
        })
      );
      expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
        2,
        generateAlertOpts({
          action: EVENT_LOG_ACTIONS.activeInstance,
          group: 'default',
          state: { bar: false, start: DATE_1969, duration: MOCK_DURATION },
        })
      );
      expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(1, generateActionOpts({}));
      expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(
        2,
        generateActionOpts({ id: '2', alertId: '2', alertGroup: 'recovered' })
      );

      expect(enqueueFunction).toHaveBeenCalledTimes(isBulk ? 1 : 2);
      expect(enqueueFunction).toHaveBeenCalledWith(
        isBulk
          ? [
              generateEnqueueFunctionInput({ isBulk: false, id: '1', foo: true }),
              generateEnqueueFunctionInput({ isBulk: false, id: '2', isResolved: true }),
            ]
          : generateEnqueueFunctionInput({ isBulk: false, id: '1', foo: true })
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      jest.resetAllMocks();
    }
  );

  test.each(ephemeralTestParams)(
    "should skip alertInstances which weren't active on the previous execution %s",
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);

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

          // create an instance, but don't schedule any actions, so it doesn't go active
          executorServices.alertFactory.create('3');
          return { state: {} };
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        {
          ...mockedTaskInstance,
          state: {
            ...mockedTaskInstance.state,
            alertInstances: {
              '1': { meta: {}, state: { bar: false } },
              '2': { meta: {}, state: { bar: false } },
            },
          },
        },
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalled();

      rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const runnerResult = await taskRunner.run();
      expect(runnerResult.state.alertInstances).toEqual(
        generateAlertInstance({
          id: 1,
          flappingHistory: [false],
        })
      );

      expect(logger.debug).toHaveBeenCalledWith(
        `rule test:1: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
      );

      expect(logger.debug).nthCalledWith(
        3,
        `rule test:1: '${RULE_NAME}' has 1 recovered alerts: [\"2\"]`
      );
      expect(logger.debug).nthCalledWith(
        4,
        `deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}`
      );
      expect(logger.debug).nthCalledWith(
        5,
        'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":1,"new":0,"recovered":1,"ignored":0}}'
      );
      expect(logger.debug).nthCalledWith(
        6,
        `ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":2,"numberOfGeneratedActions":2,"numberOfActiveAlerts":1,"numberOfRecoveredAlerts":1,"numberOfNewAlerts":0,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}`
      );

      testAlertingEventLogCalls({
        activeAlerts: 1,
        recoveredAlerts: 1,
        triggeredActions: 2,
        generatedActions: 2,
        status: 'active',
        logAlert: 2,
        logAction: 2,
      });

      expect(enqueueFunction).toHaveBeenCalledTimes(isBulk ? 1 : 2);
      if (isBulk) {
        expect((enqueueFunction as jest.Mock).mock.calls[0][0][0].id).toEqual('1');
        expect((enqueueFunction as jest.Mock).mock.calls[0][0][1].id).toEqual('2');
      } else {
        expect((enqueueFunction as jest.Mock).mock.calls[0][0].id).toEqual('1');
        expect((enqueueFunction as jest.Mock).mock.calls[1][0].id).toEqual('2');
      }
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'fire actions under a custom recovery group when specified on an alert type for alertInstances which are in the recovered state %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );

      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);

      const recoveryActionGroup = {
        id: 'customRecovered',
        name: 'Custom Recovered',
      };
      const ruleTypeWithCustomRecovery = {
        ...ruleType,
        recoveryActionGroup,
        actionGroups: [{ id: 'default', name: 'Default' }, recoveryActionGroup],
      };

      ruleTypeWithCustomRecovery.executor.mockImplementation(
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
        ruleTypeWithCustomRecovery,
        {
          ...mockedTaskInstance,
          state: {
            ...mockedTaskInstance.state,
            alertInstances: {
              '1': { meta: {}, state: { bar: false } },
              '2': { meta: {}, state: { bar: false } },
            },
          },
        },
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalled();

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: 'action',
            params: {
              foo: true,
            },
          },
          {
            group: recoveryActionGroup.id,
            id: '2',
            actionTypeId: 'action',
            params: {
              isResolved: true,
            },
          },
        ],
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const runnerResult = await taskRunner.run();
      expect(runnerResult.state.alertInstances).toEqual(
        generateAlertInstance({
          id: 1,
          flappingHistory: [false],
        })
      );

      testAlertingEventLogCalls({
        ruleContext: {
          ...alertingEventLoggerInitializer,
          ruleType: ruleTypeWithCustomRecovery,
        },
        activeAlerts: 1,
        recoveredAlerts: 1,
        triggeredActions: 2,
        generatedActions: 2,
        status: 'active',
        logAlert: 2,
        logAction: 2,
      });

      expect(enqueueFunction).toHaveBeenCalledTimes(isBulk ? 1 : 2);
      expect(enqueueFunction).toHaveBeenCalledWith(
        isBulk
          ? [
              generateEnqueueFunctionInput({ isBulk: false, id: '1', foo: true }),
              generateEnqueueFunctionInput({ isBulk: false, id: '2', isResolved: true }),
            ]
          : generateEnqueueFunctionInput({ isBulk: false, id: '1', foo: true })
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'triggers summary actions (Per rule run)',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);
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

      getSummarizedAlertsMock.mockResolvedValue({
        new: {
          count: 1,
          data: [mockAAD],
        },
        ongoing: { count: 1, data: [] },
        recovered: { count: 0, data: [] },
      });

      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: 'slack',
            frequency: {
              notifyWhen: 'onActiveAlert',
              summary: true,
              throttle: null,
            },
            params: {
              foo: true,
            },
          },
        ],
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();

      expect(ruleType.getSummarizedAlerts).toHaveBeenCalledWith({
        executionUuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
        ruleId: '1',
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(enqueueFunction).toHaveBeenCalledWith(
        generateEnqueueFunctionInput({ isBulk, id: '1', foo: true })
      );
    }
  );

  test.each(ephemeralTestParams)(
    'triggers summary actions (Custom Frequency)',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction, isBulk) => {
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
        true
      );
      customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
        true
      );
      actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(mockRunNowResponse);
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

      getSummarizedAlertsMock.mockResolvedValue({
        new: {
          count: 1,
          data: [mockAAD],
        },
        ongoing: { count: 1, data: [] },
        recovered: { count: 0, data: [] },
      });

      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams,
        inMemoryMetrics
      );
      expect(AlertingEventLogger).toHaveBeenCalledTimes(1);

      rulesClient.getAlertFromRaw.mockReturnValue({
        ...(mockedRuleTypeSavedObject as Rule),
        actions: [
          {
            group: 'default',
            id: '1',
            actionTypeId: 'slack',
            frequency: {
              notifyWhen: 'onThrottleInterval',
              summary: true,
              throttle: '1h',
            },
            params: {
              foo: true,
            },
          },
        ],
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const result = await taskRunner.run();

      expect(ruleType.getSummarizedAlerts).toHaveBeenCalledWith({
        start: new Date('1969-12-31T23:00:00.000Z'),
        end: new Date(DATE_1970),
        ruleId: '1',
        spaceId: 'default',
        excludedAlertInstanceIds: [],
      });
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(enqueueFunction).toHaveBeenCalledWith(
        generateEnqueueFunctionInput({ isBulk, id: '1', foo: true })
      );
      expect(result.state.summaryActions).toEqual({
        'slack:default:1h': { date: new Date(DATE_1970) },
      });
    }
  );

  test('persists alertInstances passed in from state, only if they are scheduled for execution', async () => {
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
    const date = new Date().toISOString();
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: { lastScheduledActions: { group: 'default', date } },
              state: {
                bar: false,
                start: DATE_1969,
                duration: '80000000000',
              },
            },
            '2': {
              meta: { lastScheduledActions: { group: 'default', date } },
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: '70000000000',
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult.state.alertInstances).toEqual(
      generateAlertInstance({
        id: 1,
        duration: MOCK_DURATION,
        start: DATE_1969,
        flappingHistory: [false],
        flapping: false,
      })
    );

    testAlertingEventLogCalls({
      activeAlerts: 1,
      recoveredAlerts: 1,
      triggeredActions: 0,
      generatedActions: 2,
      status: 'active',
      logAlert: 2,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        id: '2',
        group: 'default',
        state: {
          bar: false,
          start: '1969-12-31T06:00:00.000Z',
          duration: '64800000000000',
          end: DATE_1970,
        },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { bar: false, start: DATE_1969, duration: MOCK_DURATION },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('rescheduled the rule if the schedule has update during a task run', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();
    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      schedule: { interval: '30s' },
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(
      generateRunnerResult({ state: true, interval: '30s', history: [true] })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the RuleType executor throws an exception', async () => {
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
        throw new Error(GENERIC_ERROR_MESSAGE);
      }
    );

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));

    testAlertingEventLogCalls({
      status: 'error',
      errorReason: 'execute',
      executionStatus: 'failed',
    });

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();

    const loggerCall = logger.error.mock.calls[0][0];
    const loggerMeta = logger.error.mock.calls[0][1];
    const loggerCallPrefix = (loggerCall as string).split('-');
    expect(loggerCallPrefix[0].trim()).toMatchInlineSnapshot(
      `"Executing Rule default:test:1 has resulted in Error: GENERIC ERROR MESSAGE"`
    );
    expect(loggerMeta?.tags).toEqual(['test', '1', 'rule-run-failed']);
    expect(loggerMeta?.error?.stack_trace).toBeDefined();
    expect(logger.error).toBeCalledTimes(1);
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when loading rule to prepare for run', async () => {
    // used in loadRule() which is called in prepareToRun()
    rulesClient.getAlertFromRaw.mockImplementation(() => {
      throw new Error(GENERIC_ERROR_MESSAGE);
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));

    testAlertingEventLogCalls({
      setRuleName: false,
      status: 'error',
      errorReason: 'decrypt',
      executionStatus: 'not-reached',
    });

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Runner of a legacy Alert task which has no schedule throws an exception when fetching attributes', async () => {
    rulesClient.get.mockImplementation(() => {
      throw new Error(GENERIC_ERROR_MESSAGE);
    });

    // legacy alerts used to run by returning a new `runAt` instead of using a schedule
    // ensure we return a fallback schedule when this happens, otherwise the task might be deleted
    const legacyTaskInstance = omit(mockedTaskInstance, 'schedule');

    const taskRunner = new TaskRunner(
      ruleType,
      legacyTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0, interval: '5m' }));
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test(`doesn't change previousStartedAt when it fails to run`, async () => {
    const originalAlertSate = {
      previousStartedAt: DATE_1970,
    };

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
        throw new Error(GENERIC_ERROR_MESSAGE);
      }
    );

    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: originalAlertSate,
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult.state.previousStartedAt).toEqual(
      new Date(originalAlertSate.previousStartedAt)
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('avoids rescheduling a failed Alert Task Runner when it throws due to failing to fetch the alert', async () => {
    rulesClient.get.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        params: {
          ...mockedTaskInstance.params,
          spaceId: 'foo',
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    return taskRunner.run().catch((ex) => {
      expect(ex.toString()).toEqual(`Error: Saved object [alert/1] not found`);
      const updateRuleDebugLogger = logger.debug.mock.calls[3][0];
      expect(updateRuleDebugLogger as string).toMatchInlineSnapshot(
        `"Updating rule task for test rule with id 1 - {\\"lastExecutionDate\\":\\"1970-01-01T00:00:00.000Z\\",\\"status\\":\\"error\\",\\"error\\":{\\"reason\\":\\"read\\",\\"message\\":\\"Saved object [alert/1] not found\\"}} - {\\"outcome\\":\\"failed\\",\\"warning\\":\\"read\\",\\"outcomeMsg\\":\\"Saved object [alert/1] not found\\",\\"alertsCount\\":{}}"`
      );
      const executeRuleDebugLogger = logger.debug.mock.calls[4][0];
      expect(executeRuleDebugLogger as string).toMatchInlineSnapshot(
        `"Executing Rule foo:test:1 has resulted in Error: Saved object [alert/1] not found"`
      );

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).nthCalledWith(
        1,
        `Unable to execute rule "1" in the "foo" space because Saved object [alert/1] not found - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
      );
      expect(isUnrecoverableError(ex)).toBeTruthy();
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    });
  });

  test('reschedules for next schedule interval if es connectivity error encountered and schedule interval is less than connectivity retry', async () => {
    rulesClient.get.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('alert', '1');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();
    expect(runnerResult.schedule!.interval).toEqual(mockedTaskInstance.schedule!.interval);
  });

  test('reschedules for smaller interval if es connectivity error encountered and schedule interval is greater than connectivity retry', async () => {
    rulesClient.getAlertFromRaw.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('alert', '1');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        schedule: {
          interval: '1d',
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult.schedule!.interval).toEqual('5m');
  });

  test('correctly logs warning when Alert Task Runner throws due to failing to fetch the alert in a space', async () => {
    rulesClient.get.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        params: {
          ...mockedTaskInstance.params,
          spaceId: 'test space',
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    return taskRunner.run().catch((ex) => {
      expect(ex.toString()).toEqual(`Error: Saved object [alert/1] not found`);
      const updateRuleDebugLogger = logger.debug.mock.calls[3][0];
      expect(updateRuleDebugLogger as string).toMatchInlineSnapshot(
        `"Updating rule task for test rule with id 1 - {\\"lastExecutionDate\\":\\"1970-01-01T00:00:00.000Z\\",\\"status\\":\\"error\\",\\"error\\":{\\"reason\\":\\"read\\",\\"message\\":\\"Saved object [alert/1] not found\\"}} - {\\"outcome\\":\\"failed\\",\\"warning\\":\\"read\\",\\"outcomeMsg\\":\\"Saved object [alert/1] not found\\",\\"alertsCount\\":{}}"`
      );
      const ruleExecuteDebugLog = logger.debug.mock.calls[4][0];
      expect(ruleExecuteDebugLog as string).toMatchInlineSnapshot(
        `"Executing Rule test space:test:1 has resulted in Error: Saved object [alert/1] not found"`
      );

      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).nthCalledWith(
        1,
        `Unable to execute rule "1" in the "test space" space because Saved object [alert/1] not found - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    });
  });

  test('start time is logged for new alerts', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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
        executorServices.alertFactory.create('2').scheduleActions('default');
        return { state: {} };
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {},
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    testAlertingEventLogCalls({
      activeAlerts: 2,
      newAlerts: 2,
      status: 'active',
      logAlert: 4,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.newInstance,
        group: 'default',
        state: {
          start: DATE_1970,
          duration: '0',
        },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        id: '2',
        action: EVENT_LOG_ACTIONS.newInstance,
        group: 'default',
        state: {
          start: DATE_1970,
          duration: '0',
        },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      3,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { start: DATE_1970, duration: '0' },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      4,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        id: '2',
        group: 'default',
        state: { start: DATE_1970, duration: '0' },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('duration is updated for active alerts when alert state contains start time', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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
        executorServices.alertFactory.create('2').scheduleActions('default');
        return { state: {} };
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: {},
              state: {
                bar: false,
                start: DATE_1969,
                duration: '80000000000',
              },
            },
            '2': {
              meta: {},
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: '70000000000',
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    testAlertingEventLogCalls({
      activeAlerts: 2,
      status: 'active',
      logAlert: 2,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { bar: false, start: DATE_1969, duration: MOCK_DURATION },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        id: '2',
        group: 'default',
        state: { bar: false, start: '1969-12-31T06:00:00.000Z', duration: '64800000000000' },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('duration is not calculated for active alerts when alert state does not contain start time', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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
        executorServices.alertFactory.create('2').scheduleActions('default');
        return { state: {} };
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: {},
              state: { bar: false },
            },
            '2': {
              meta: {},
              state: { bar: false },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    testAlertingEventLogCalls({
      activeAlerts: 2,
      status: 'active',
      logAlert: 2,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { bar: false },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        id: '2',
        group: 'default',
        state: { bar: false },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('end is logged for active alerts when alert state contains start time and alert recovers', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    ruleType.executor.mockImplementation(async () => {
      return { state: {} };
    });
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: {},
              state: {
                bar: false,
                start: DATE_1969,
                duration: '80000000000',
              },
            },
            '2': {
              meta: {},
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: '70000000000',
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    testAlertingEventLogCalls({
      recoveredAlerts: 2,
      status: 'ok',
      logAlert: 2,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        state: { bar: false, start: DATE_1969, end: DATE_1970, duration: MOCK_DURATION },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        id: '2',
        state: {
          bar: false,
          start: '1969-12-31T06:00:00.000Z',
          end: DATE_1970,
          duration: '64800000000000',
        },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('end calculation is skipped for active alerts when alert state does not contain start time and alert recovers', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
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
        return { state: {} };
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: {},
              state: { bar: false },
            },
            '2': {
              meta: {},
              state: { bar: false },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    testAlertingEventLogCalls({
      recoveredAlerts: 2,
      status: 'ok',
      logAlert: 2,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        state: { bar: false },
      })
    );
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      2,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        id: '2',
        state: {
          bar: false,
        },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('successfully executes the task with ephemeral tasks enabled', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      {
        ...taskRunnerFactoryInitializerParams,
        supportsEphemeralTasks: true,
      },
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ state: true, history: [true] }));
    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    const call = ruleType.executor.mock.calls[0][0];
    expect(call.params).toEqual({ bar: true });
    expect(call.startedAt).toEqual(new Date(DATE_1970));
    expect(call.previousStartedAt).toEqual(new Date(DATE_1970_5_MIN));
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
    expect(call.services.scopedClusterClient).toBeTruthy();
    expect(call.services).toBeTruthy();

    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'deprecated ruleRunStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );
    expect(logger.debug).nthCalledWith(
      3,
      'ruleRunStatus for test:1: {"outcome":"succeeded","outcomeMsg":null,"warning":null,"alertsCount":{"active":0,"new":0,"recovered":0,"ignored":0}}'
    );
    expect(logger.debug).nthCalledWith(
      4,
      'ruleRunMetrics for test:1: {"numSearches":3,"totalSearchDurationMs":23423,"esSearchDurationMs":33,"numberOfTriggeredActions":0,"numberOfGeneratedActions":0,"numberOfActiveAlerts":0,"numberOfRecoveredAlerts":0,"numberOfNewAlerts":0,"hasReachedAlertLimit":false,"triggeredActionsStatus":"complete"}'
    );

    testAlertingEventLogCalls({
      status: 'ok',
    });

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({}));
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('successfully stores successful runs', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ state: true, history: [true] }));
  });

  test('successfully stores failure runs', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);
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
        throw new Error(GENERIC_ERROR_MESSAGE);
      }
    );
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0, success: false }));
  });

  test('successfully stores the success ratio', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();
    await taskRunner.run();
    await taskRunner.run();

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
        throw new Error(GENERIC_ERROR_MESSAGE);
      }
    );
    const runnerResult = await taskRunner.run();
    ruleType.executor.mockClear();
    expect(runnerResult).toEqual(
      generateRunnerResult({ successRatio: 0.75, history: [true, true, true, false] })
    );
  });

  test('successfully stores next run', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();
    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      schedule: { interval: '50s' },
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    await taskRunner.run();
    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      ...generateSavedObjectParams({
        nextRun: '1970-01-01T00:00:50.000Z',
      })
    );
  });

  test('updates the rule saved object correctly when failed', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

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
        throw new Error(GENERIC_ERROR_MESSAGE);
      }
    );
    await taskRunner.run();
    ruleType.executor.mockClear();
    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      ...generateSavedObjectParams({
        error: {
          message: GENERIC_ERROR_MESSAGE,
          reason: 'execute',
        },
        outcome: 'failed',
        status: 'error',
        successRatio: 0,
        history: [
          {
            success: false,
            timestamp: 0,
          },
        ],
      })
    );
  });

  test('caps monitoring history at 200', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    for (let i = 0; i < 300; i++) {
      await taskRunner.run();
    }
    const runnerResult = await taskRunner.run();
    expect(runnerResult.monitoring?.run.history.length).toBe(200);
  });

  test('Actions circuit breaker kicked in, should set status as warning and log a message in event log', async () => {
    const actionsConfigMap = {
      default: {
        max: 3,
      },
    };

    const warning = {
      reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      message: translations.taskRunner.warning.maxExecutableActions,
    };

    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);

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

    const mockActions = [
      {
        group: 'default',
        id: '1',
        actionTypeId: 'action',
      },
      {
        group: 'default',
        id: '2',
        actionTypeId: 'action',
      },
      {
        group: 'default',
        id: '3',
        actionTypeId: 'action',
      },
      {
        group: 'default',
        id: '4',
        actionTypeId: 'action',
      },
      {
        group: 'default',
        id: '5',
        actionTypeId: 'action',
      },
    ];

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      actions: mockActions as RuleAction[],
    });

    ruleTypeRegistry.get.mockReturnValue(ruleType);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      {
        ...taskRunnerFactoryInitializerParams,
        actionsConfigMap,
      },
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    const runnerResult = await taskRunner.run();

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      ...generateSavedObjectParams({
        status: 'warning',
        outcome: 'warning',
        warning,
        alertsCount: {
          active: 1,
          new: 1,
        },
      })
    );

    expect(runnerResult).toEqual(
      generateRunnerResult({
        state: true,
        history: [true],
        alertInstances: {
          '1': {
            meta: {
              lastScheduledActions: {
                date: new Date(DATE_1970),
                group: 'default',
              },
              flappingHistory: [true],
              flapping: false,
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
      })
    );

    expect(logger.debug).toHaveBeenCalledTimes(7);

    expect(logger.debug).nthCalledWith(
      3,
      'Rule "1" skipped scheduling action "4" because the maximum number of allowed actions has been reached.'
    );

    testAlertingEventLogCalls({
      newAlerts: 1,
      activeAlerts: 1,
      triggeredActions: actionsConfigMap.default.max,
      generatedActions: mockActions.length,
      status: 'warning',
      errorReason: `maxExecutableActions`,
      logAlert: 2,
      logAction: 3,
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
    expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(
      2,
      generateActionOpts({ id: '2' })
    );
    expect(alertingEventLogger.logAction).toHaveBeenNthCalledWith(
      3,
      generateActionOpts({ id: '3' })
    );
  });

  test('Actions circuit breaker kicked in with connectorType specific config and multiple alerts', async () => {
    const actionsConfigMap = {
      default: {
        max: 30,
      },
      '.server-log': {
        max: 1,
      },
    };

    const warning = {
      reason: RuleExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      message: translations.taskRunner.warning.maxExecutableActions,
    };

    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);

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
        executorServices.alertFactory.create('2').scheduleActions('default');
        return { state: {} };
      }
    );

    rulesClient.getAlertFromRaw.mockReturnValue({
      ...(mockedRuleTypeSavedObject as Rule),
      actions: [
        {
          group: 'default',
          id: '1',
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: '2',
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: '3',
          actionTypeId: '.server-log',
        },
        {
          group: 'default',
          id: '4',
          actionTypeId: 'any-action',
        },
        {
          group: 'default',
          id: '5',
          actionTypeId: 'any-action',
        },
      ] as RuleAction[],
    });

    ruleTypeRegistry.get.mockReturnValue(ruleType);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      {
        ...taskRunnerFactoryInitializerParams,
        actionsConfigMap,
      },
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    const runnerResult = await taskRunner.run();

    expect(actionsClient.bulkEnqueueExecution).toHaveBeenCalledTimes(1);

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      ...generateSavedObjectParams({
        status: 'warning',
        outcome: 'warning',
        warning,
        alertsCount: {
          active: 2,
          new: 2,
        },
      })
    );

    expect(runnerResult).toEqual(
      generateRunnerResult({
        state: true,
        history: [true],
        alertInstances: {
          '1': {
            meta: {
              lastScheduledActions: {
                date: new Date(DATE_1970),
                group: 'default',
              },
              flappingHistory: [true],
              flapping: false,
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
          '2': {
            meta: {
              lastScheduledActions: {
                date: new Date(DATE_1970),
                group: 'default',
              },
              flappingHistory: [true],
              flapping: false,
            },
            state: {
              duration: '0',
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
      })
    );

    expect(logger.debug).toHaveBeenCalledTimes(7);

    expect(logger.debug).nthCalledWith(
      3,
      'Rule "1" skipped scheduling action "1" because the maximum number of allowed actions for connector type .server-log has been reached.'
    );

    testAlertingEventLogCalls({
      newAlerts: 2,
      activeAlerts: 2,
      generatedActions: 10,
      triggeredActions: 5,
      status: 'warning',
      errorReason: `maxExecutableActions`,
      logAlert: 4,
      logAction: 5,
    });
  });

  test('increments monitoring metrics after execution', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    await taskRunner.run();
    await taskRunner.run();
    await taskRunner.run();

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
        throw new Error('OMG');
      }
    );
    await taskRunner.run();
    await taskRunner.cancel();

    expect(inMemoryMetrics.increment).toHaveBeenCalledTimes(6);
    expect(inMemoryMetrics.increment.mock.calls[0][0]).toBe(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.increment.mock.calls[1][0]).toBe(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.increment.mock.calls[2][0]).toBe(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.increment.mock.calls[3][0]).toBe(IN_MEMORY_METRICS.RULE_EXECUTIONS);
    expect(inMemoryMetrics.increment.mock.calls[4][0]).toBe(IN_MEMORY_METRICS.RULE_FAILURES);
    expect(inMemoryMetrics.increment.mock.calls[5][0]).toBe(IN_MEMORY_METRICS.RULE_TIMEOUTS);
  });

  test('does not persist alertInstances or recoveredAlertInstances passed in from state if autoRecoverAlerts is false', async () => {
    ruleType.autoRecoverAlerts = false;
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
    const date = new Date().toISOString();
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: { lastScheduledActions: { group: 'default', date } },
              state: {
                bar: false,
                start: DATE_1969,
                duration: '80000000000',
              },
            },
            '2': {
              meta: { lastScheduledActions: { group: 'default', date } },
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: '70000000000',
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );
    expect(AlertingEventLogger).toHaveBeenCalled();

    rulesClient.getAlertFromRaw.mockReturnValue(mockedRuleTypeSavedObject as Rule);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult.state.alertInstances).toEqual({});
    expect(runnerResult.state.alertRecoveredInstances).toEqual({});

    testAlertingEventLogCalls({
      activeAlerts: 1,
      recoveredAlerts: 0,
      triggeredActions: 0,
      generatedActions: 1,
      status: 'ok',
      logAlert: 1,
    });
    expect(alertingEventLogger.logAlert).toHaveBeenNthCalledWith(
      1,
      generateAlertOpts({
        action: EVENT_LOG_ACTIONS.activeInstance,
        group: 'default',
        state: { bar: false, start: DATE_1969, duration: MOCK_DURATION },
      })
    );

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  function testAlertingEventLogCalls({
    ruleContext = alertingEventLoggerInitializer,
    activeAlerts = 0,
    newAlerts = 0,
    recoveredAlerts = 0,
    triggeredActions = 0,
    generatedActions = 0,
    status,
    errorReason,
    errorMessage = 'GENERIC ERROR MESSAGE',
    executionStatus = 'succeeded',
    setRuleName = true,
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
    executionStatus?: 'succeeded' | 'failed' | 'not-reached';
    setRuleName?: boolean;
    logAlert?: number;
    logAction?: number;
    errorReason?: string;
    errorMessage?: string;
    hasReachedAlertLimit?: boolean;
  }) {
    expect(alertingEventLogger.initialize).toHaveBeenCalledWith(ruleContext);
    expect(alertingEventLogger.start).toHaveBeenCalled();
    if (setRuleName) {
      expect(alertingEventLogger.setRuleName).toHaveBeenCalledWith(mockedRuleTypeSavedObject.name);
    } else {
      expect(alertingEventLogger.setRuleName).not.toHaveBeenCalled();
    }
    expect(alertingEventLogger.getStartAndDuration).toHaveBeenCalled();
    if (status === 'error') {
      expect(alertingEventLogger.done).toHaveBeenCalledWith({
        metrics: null,
        status: {
          lastExecutionDate: new Date('1970-01-01T00:00:00.000Z'),
          status,
          error: {
            message: errorMessage,
            reason: errorReason,
          },
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
    } else if (status === 'warning') {
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
          triggeredActionsStatus: 'partial',
        },
        status: {
          lastExecutionDate: new Date('1970-01-01T00:00:00.000Z'),
          status,
          warning: {
            message: `The maximum number of actions for this rule type was reached; excess actions were not triggered.`,
            reason: errorReason,
          },
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
    } else {
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
    }

    if (executionStatus === 'succeeded') {
      expect(alertingEventLogger.setExecutionSucceeded).toHaveBeenCalledWith(
        `rule executed: test:1: 'rule-name'`
      );
      expect(alertingEventLogger.setExecutionFailed).not.toHaveBeenCalled();
    } else if (executionStatus === 'failed') {
      expect(alertingEventLogger.setExecutionFailed).toHaveBeenCalledWith(
        `rule execution failure: test:1: 'rule-name'`,
        errorMessage
      );
      expect(alertingEventLogger.setExecutionSucceeded).not.toHaveBeenCalled();
    } else if (executionStatus === 'not-reached') {
      expect(alertingEventLogger.setExecutionSucceeded).not.toHaveBeenCalled();
      expect(alertingEventLogger.setExecutionFailed).not.toHaveBeenCalled();
    }

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
    expect(alertingEventLogger.logTimeout).not.toHaveBeenCalled();
  }
});

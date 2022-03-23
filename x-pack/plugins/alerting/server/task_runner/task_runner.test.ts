/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { schema } from '@kbn/config-schema';
import { usageCountersServiceMock } from 'src/plugins/usage_collection/server/usage_counters/usage_counters_service.mock';
import {
  AlertExecutorOptions,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  AlertExecutionStatusWarningReasons,
} from '../types';
import {
  ConcreteTaskInstance,
  isUnrecoverableError,
  RunNowResult,
} from '../../../task_manager/server';
import { TaskRunnerContext } from './task_runner_factory';
import { TaskRunner } from './task_runner';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
  httpServiceMock,
  executionContextServiceMock,
  savedObjectsServiceMock,
  elasticsearchServiceMock,
  uiSettingsServiceMock,
} from '../../../../../src/core/server/mocks';
import { PluginStartContract as ActionsPluginStart } from '../../../actions/server';
import { actionsMock, actionsClientMock } from '../../../actions/server/mocks';
import { alertsMock, rulesClientMock } from '../mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { IEventLogger } from '../../../event_log/server';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { omit } from 'lodash';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { ExecuteOptions } from '../../../actions/server/create_execute_function';
import moment from 'moment';
import {
  generateActionSO,
  generateAlertSO,
  generateEventLog,
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
} from './fixtures';
import { EVENT_LOG_ACTIONS } from '../plugin';
import { translations } from '../constants/translations';

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
}));

jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn(),
}));

let fakeTimer: sinon.SinonFakeTimers;

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

describe('Task Runner', () => {
  let mockedTaskInstance: ConcreteTaskInstance;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = mockTaskInstance();
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
  const services = alertsMock.createAlertServices();
  const actionsClient = actionsClientMock.create();
  const rulesClient = rulesClientMock.create();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();
  const savedObjectsService = savedObjectsServiceMock.createInternalStartContract();
  const elasticsearchService = elasticsearchServiceMock.createInternalStart();
  const uiSettingsService = uiSettingsServiceMock.createStartContract();

  type TaskRunnerFactoryInitializerParamsType = jest.Mocked<TaskRunnerContext> & {
    actionsPlugin: jest.Mocked<ActionsPluginStart>;
    eventLogger: jest.Mocked<IEventLogger>;
    executionContext: ReturnType<typeof executionContextServiceMock.createInternalStartContract>;
  };

  type EnqueueFunction = (options: ExecuteOptions) => Promise<void | RunNowResult>;

  const taskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType = {
    savedObjects: savedObjectsService,
    uiSettings: uiSettingsService,
    elasticsearch: elasticsearchService,
    actionsPlugin: actionsMock.createStart(),
    getRulesClientWithRequest: jest.fn().mockReturnValue(rulesClient),
    encryptedSavedObjectsClient,
    logger: loggingSystemMock.create().get(),
    executionContext: executionContextServiceMock.createInternalStartContract(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    basePathService: httpServiceMock.createBasePath(),
    eventLogger: eventLoggerMock.create(),
    internalSavedObjectsRepository: savedObjectsRepositoryMock.create(),
    ruleTypeRegistry,
    kibanaBaseUrl: 'https://localhost:5601',
    supportsEphemeralTasks: false,
    maxEphemeralActionsPerRule: 10,
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
      enqueueFunction: EnqueueFunction
    ]
  > = [
    ['', taskRunnerFactoryInitializerParams, actionsClient.enqueueExecution],
    [
      ' (with ephemeral support)',
      {
        ...taskRunnerFactoryInitializerParams,
        supportsEphemeralTasks: true,
      },
      actionsClient.ephemeralEnqueuedExecution,
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
    mockedRuleTypeSavedObject.monitoring!.execution.history = [];
    mockedRuleTypeSavedObject.monitoring!.execution.calculated_metrics.success_ratio = 0;
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
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ state: true, history: [true] }));
    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    const call = ruleType.executor.mock.calls[0][0];
    expect(call.params).toEqual({ bar: true });
    expect(call.startedAt).toStrictEqual(new Date(DATE_1970));
    expect(call.previousStartedAt).toStrictEqual(new Date(DATE_1970_5_MIN));
    expect(call.state).toEqual({});
    expect(call.name).toBe(RULE_NAME);
    expect(call.tags).toEqual(['rule-', '-tags']);
    expect(call.createdBy).toBe('rule-creator');
    expect(call.updatedBy).toBe('rule-updater');
    expect(call.rule).not.toBe(null);
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

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":0,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenCalledWith(
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
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
  });

  test.each(ephemeralTestParams)(
    'actionsPlugin.execute is called per alert alert that is scheduled %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory
            .create('1')
            .scheduleActionsWithSubGroup('default', 'subDefault');
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(enqueueFunction).toHaveBeenCalledWith(generateEnqueueFunctionInput());

      const logger = customTaskRunnerFactoryInitializerParams.logger;
      expect(logger.debug).toHaveBeenCalledTimes(4);
      expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
      expect(logger.debug).nthCalledWith(
        2,
        `rule test:1: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
      );
      expect(logger.debug).nthCalledWith(
        3,
        'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":1,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
      );

      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        1,
        generateEventLog({
          task: true,
          action: EVENT_LOG_ACTIONS.executeStart,
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        2,
        generateEventLog({
          duration: 0,
          start: DATE_1970,
          action: EVENT_LOG_ACTIONS.newInstance,
          actionSubgroup: 'subDefault',
          actionGroupId: 'default',
          instanceId: '1',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        3,
        generateEventLog({
          duration: 0,
          start: DATE_1970,
          action: EVENT_LOG_ACTIONS.activeInstance,
          actionGroupId: 'default',
          actionSubgroup: 'subDefault',
          instanceId: '1',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        4,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.executeAction,
          actionGroupId: 'default',
          instanceId: '1',
          actionSubgroup: 'subDefault',
          savedObjects: [generateAlertSO('1'), generateActionSO('1')],
          actionId: '1',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        5,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.execute,
          outcome: 'success',
          status: 'active',
          numberOfTriggeredActions: 1,
          task: true,
        })
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test('actionsPlugin.execute is skipped if muteAll is true', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      muteAll: true,
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();
    expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `rule test:1: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `no scheduling of actions for rule test:1: '${RULE_NAME}': rule is muted.`
    );
    expect(logger.debug).nthCalledWith(
      4,
      'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":0,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.newInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'active',
        numberOfTriggeredActions: 0,
        task: true,
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
          executorServices.alertFactory.create('2').scheduleActions('default');
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue({
        ...mockedRuleTypeSavedObject,
        mutedInstanceIds: ['2'],
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(enqueueFunction).toHaveBeenCalledTimes(1);

      const logger = customTaskRunnerFactoryInitializerParams.logger;
      expect(logger.debug).toHaveBeenCalledTimes(5);
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
        'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":1,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
          executorServices.alertFactory.create('2').scheduleActions('default');
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
        taskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue({
        ...mockedRuleTypeSavedObject,
        throttle: '1d',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      // expect(enqueueFunction).toHaveBeenCalledTimes(1);

      const logger = customTaskRunnerFactoryInitializerParams.logger;
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
          executorServices.alertFactory.create('2').scheduleActions('default');
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue({
        ...mockedRuleTypeSavedObject,
        mutedInstanceIds: ['2'],
        notifyWhen: 'onActionGroupChange',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      const logger = customTaskRunnerFactoryInitializerParams.logger;
      expect(logger.debug).toHaveBeenCalledTimes(5);
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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
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
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();
    expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        duration: MOCK_DURATION,
        start: DATE_1969,
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'active',
        numberOfTriggeredActions: 0,
        task: true,
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test.each(ephemeralTestParams)(
    'actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert alert state has changed %s',
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
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
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue({
        ...mockedRuleTypeSavedObject,
        notifyWhen: 'onActionGroupChange',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;

      await taskRunner.run();

      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        4,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.execute,
          outcome: 'success',
          status: 'active',
          numberOfTriggeredActions: 1,
          task: true,
        })
      );
      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert state subgroup has changed %s',
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory
            .create('1')
            .scheduleActionsWithSubGroup('default', 'subgroup1');
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
                  lastScheduledActions: {
                    group: 'default',
                    subgroup: 'newSubgroup',
                    date: new Date().toISOString(),
                  },
                },
                state: { bar: false },
              },
            },
          },
        },
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue({
        ...mockedRuleTypeSavedObject,
        notifyWhen: 'onActionGroupChange',
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      await taskRunner.run();

      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;

      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        4,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.execute,
          outcome: 'success',
          status: 'active',
          numberOfTriggeredActions: 1,
          task: true,
        })
      );

      expect(enqueueFunction).toHaveBeenCalledTimes(1);
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'includes the apiKey in the request used to initialize the actionsClient %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
        }
      );
      const taskRunner = new TaskRunner(
        ruleType,
        mockedTaskInstance,
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);
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
      expect(enqueueFunction).toHaveBeenCalledWith(generateEnqueueFunctionInput());

      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);

      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        1,
        generateEventLog({
          task: true,
          action: EVENT_LOG_ACTIONS.executeStart,
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        2,
        generateEventLog({
          duration: 0,
          start: DATE_1970,
          action: EVENT_LOG_ACTIONS.newInstance,
          actionGroupId: 'default',
          instanceId: '1',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        3,
        generateEventLog({
          duration: 0,
          start: DATE_1970,
          action: EVENT_LOG_ACTIONS.activeInstance,
          actionGroupId: 'default',
          instanceId: '1',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        4,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.executeAction,
          actionGroupId: 'default',
          instanceId: '1',
          actionId: '1',
          savedObjects: [generateAlertSO('1'), generateActionSO('1')],
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        5,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.execute,
          outcome: 'success',
          status: 'active',
          numberOfTriggeredActions: 1,
          task: true,
        })
      );
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'fire recovered actions for execution for the alertInstances which is in the recovered state %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
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
                  duration: 80000000000,
                },
              },
              '2': {
                meta: {},
                state: {
                  bar: false,
                  start: '1969-12-31T06:00:00.000Z',
                  duration: 70000000000,
                },
              },
            },
          },
        },
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const runnerResult = await taskRunner.run();
      expect(runnerResult.state.alertInstances).toEqual(
        generateAlertInstance({ id: 1, duration: MOCK_DURATION, start: DATE_1969 })
      );

      const logger = customTaskRunnerFactoryInitializerParams.logger;
      expect(logger.debug).toHaveBeenCalledTimes(5);
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
        'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":2,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
      );

      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
      expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);

      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        1,
        generateEventLog({
          task: true,
          action: EVENT_LOG_ACTIONS.executeStart,
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        2,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.recoveredInstance,
          duration: 64800000000000,
          instanceId: '2',
          start: '1969-12-31T06:00:00.000Z',
          end: DATE_1970,
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        3,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.activeInstance,
          actionGroupId: 'default',
          duration: MOCK_DURATION,
          start: DATE_1969,
          instanceId: '1',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        4,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.executeAction,
          savedObjects: [generateAlertSO('1'), generateActionSO('1')],
          actionGroupId: 'default',
          instanceId: '1',
          actionId: '1',
        })
      );

      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        5,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.executeAction,
          savedObjects: [generateAlertSO('1'), generateActionSO('2')],
          actionGroupId: 'recovered',
          instanceId: '2',
          actionId: '2',
        })
      );
      expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
        6,
        generateEventLog({
          action: EVENT_LOG_ACTIONS.execute,
          outcome: 'success',
          status: 'active',
          numberOfTriggeredActions: 2,
          task: true,
        })
      );

      expect(enqueueFunction).toHaveBeenCalledTimes(2);
      expect(enqueueFunction).toHaveBeenCalledWith(generateEnqueueFunctionInput());
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    "should skip alertInstances which weren't active on the previous execution %s",
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
      const alertId = 'e558aaad-fd81-46d2-96fc-3bd8fc3dc03f';
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');

          // create an instance, but don't schedule any actions, so it doesn't go active
          executorServices.alertFactory.create('3');
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
          params: {
            alertId,
          },
        },
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
      const runnerResult = await taskRunner.run();
      expect(runnerResult.state.alertInstances).toEqual(generateAlertInstance());

      const logger = customTaskRunnerFactoryInitializerParams.logger;
      expect(logger.debug).toHaveBeenCalledWith(
        `rule test:${alertId}: '${RULE_NAME}' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
      );

      expect(logger.debug).nthCalledWith(
        3,
        `rule test:${alertId}: '${RULE_NAME}' has 1 recovered alerts: [\"2\"]`
      );
      expect(logger.debug).nthCalledWith(
        4,
        `ruleExecutionStatus for test:${alertId}: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":2,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}`
      );

      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
      expect(enqueueFunction).toHaveBeenCalledTimes(2);
      expect((enqueueFunction as jest.Mock).mock.calls[1][0].id).toEqual('2');
      expect((enqueueFunction as jest.Mock).mock.calls[0][0].id).toEqual('1');
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test.each(ephemeralTestParams)(
    'fire actions under a custom recovery group when specified on an alert type for alertInstances which are in the recovered state %s',
    async (nameExtension, customTaskRunnerFactoryInitializerParams, enqueueFunction) => {
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
        }: AlertExecutorOptions<
          AlertTypeParams,
          AlertTypeState,
          AlertInstanceState,
          AlertInstanceContext,
          string
        >) => {
          executorServices.alertFactory.create('1').scheduleActions('default');
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
        customTaskRunnerFactoryInitializerParams
      );
      rulesClient.get.mockResolvedValue({
        ...mockedRuleTypeSavedObject,
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
      expect(runnerResult.state.alertInstances).toEqual(generateAlertInstance());

      const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
      expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
      expect(enqueueFunction).toHaveBeenCalledTimes(2);
      expect(enqueueFunction).toHaveBeenCalledWith(generateEnqueueFunctionInput());
      expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    }
  );

  test('persists alertInstances passed in from state, only if they are scheduled for execution', async () => {
    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
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
                duration: 80000000000,
              },
            },
            '2': {
              meta: { lastScheduledActions: { group: 'default', date } },
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: 70000000000,
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult.state.alertInstances).toEqual(
      generateAlertInstance({ id: 1, duration: MOCK_DURATION, start: DATE_1969 })
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        actionGroupId: 'default',
        duration: 64800000000000,
        instanceId: '2',
        start: '1969-12-31T06:00:00.000Z',
        end: DATE_1970,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        duration: MOCK_DURATION,
        start: DATE_1969,
        instanceId: '1',
      })
    );

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'active',
        numberOfTriggeredActions: 0,
        task: true,
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('validates params before executing the alert type', async () => {
    const taskRunner = new TaskRunner(
      {
        ...ruleType,
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
      },
      {
        ...mockedTaskInstance,
        params: {
          ...mockedTaskInstance.params,
          spaceId: 'foo',
        },
      },
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));
    expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
      `Executing Rule foo:test:1 has resulted in Error: params invalid: [param1]: expected value of type [string] but got [undefined]`
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('uses API key when provided', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

    await taskRunner.run();
    expect(taskRunnerFactoryInitializerParams.getRulesClientWithRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          // base64 encoded "123:abc"
          authorization: 'ApiKey MTIzOmFiYw==',
        },
      })
    );
    const [request] = taskRunnerFactoryInitializerParams.getRulesClientWithRequest.mock.calls[0];

    expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
      request,
      '/'
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test(`doesn't use API key when not provided`, async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      ...SAVED_OBJECT,
      attributes: { enabled: true },
    });

    await taskRunner.run();

    expect(taskRunnerFactoryInitializerParams.getRulesClientWithRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {},
      })
    );

    const [request] = taskRunnerFactoryInitializerParams.getRulesClientWithRequest.mock.calls[0];

    expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
      request,
      '/'
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('rescheduled the Alert if the schedule has update during a task run', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValueOnce(mockedRuleTypeSavedObject);
    rulesClient.get.mockResolvedValueOnce({
      ...mockedRuleTypeSavedObject,
      schedule: { interval: '30s' },
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
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
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));
    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'failure',
        reason: 'execute',
        task: true,
        status: 'error',
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching the encrypted attributes', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockImplementation(() => {
      throw new Error(GENERIC_ERROR_MESSAGE);
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'failure',
        task: true,
        reason: 'decrypt',
        status: 'error',
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when license is higher than supported', async () => {
    ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
      throw new Error(GENERIC_ERROR_MESSAGE);
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'failure',
        task: true,
        reason: 'license',
        status: 'error',
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when getting internal Services', async () => {
    taskRunnerFactoryInitializerParams.getRulesClientWithRequest.mockImplementation(() => {
      throw new Error(GENERIC_ERROR_MESSAGE);
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'failure',
        task: true,
        reason: 'unknown',
        status: 'error',
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching attributes', async () => {
    rulesClient.get.mockImplementation(() => {
      throw new Error(GENERIC_ERROR_MESSAGE);
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toEqual(generateRunnerResult({ successRatio: 0 }));

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'failure',
        task: true,
        reason: 'read',
        status: 'error',
      })
    );
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
      taskRunnerFactoryInitializerParams
    );

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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
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
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
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
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const logger = taskRunnerFactoryInitializerParams.logger;
    return taskRunner.run().catch((ex) => {
      expect(ex.toString()).toEqual(`Error: Saved object [alert/1] not found`);
      expect(logger.debug).toHaveBeenCalledWith(
        `Executing Rule foo:test:1 has resulted in Error: Saved object [alert/1] not found`
      );
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
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const runnerResult = await taskRunner.run();
    expect(runnerResult.schedule!.interval).toEqual(mockedTaskInstance.schedule!.interval);
  });

  test('reschedules for smaller interval if es connectivity error encountered and schedule interval is greater than connectivity retry', async () => {
    rulesClient.get.mockImplementation(() => {
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
      taskRunnerFactoryInitializerParams
    );

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
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    const logger = taskRunnerFactoryInitializerParams.logger;
    return taskRunner.run().catch((ex) => {
      expect(ex.toString()).toEqual(`Error: Saved object [alert/1] not found`);
      expect(logger.debug).toHaveBeenCalledWith(
        `Executing Rule test space:test:1 has resulted in Error: Saved object [alert/1] not found`
      );
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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
        executorServices.alertFactory.create('2').scheduleActions('default');
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
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.newInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.newInstance,
        actionGroupId: 'default',
        instanceId: '2',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      5,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '2',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      6,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'active',
        numberOfTriggeredActions: 0,
        task: true,
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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
        executorServices.alertFactory.create('2').scheduleActions('default');
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
                duration: 80000000000,
              },
            },
            '2': {
              meta: {},
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: 70000000000,
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        duration: MOCK_DURATION,
        start: DATE_1969,
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        duration: 64800000000000,
        start: '1969-12-31T06:00:00.000Z',
        instanceId: '2',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'active',
        numberOfTriggeredActions: 0,
        task: true,
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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
        executorServices.alertFactory.create('2').scheduleActions('default');
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
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '2',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'active',
        numberOfTriggeredActions: 0,
        task: true,
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('end is logged for active alerts when alert state contains start time and alert recovers', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    ruleType.executor.mockImplementation(async () => {});
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
                duration: 80000000000,
              },
            },
            '2': {
              meta: {},
              state: {
                bar: false,
                start: '1969-12-31T06:00:00.000Z',
                duration: 70000000000,
              },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        duration: MOCK_DURATION,
        start: DATE_1969,
        end: DATE_1970,
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        duration: 64800000000000,
        start: '1969-12-31T06:00:00.000Z',
        end: DATE_1970,
        instanceId: '2',
      })
    );

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'ok',
        numberOfTriggeredActions: 0,
        task: true,
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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {}
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
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.recoveredInstance,
        instanceId: '2',
      })
    );

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'ok',
        numberOfTriggeredActions: 0,
        task: true,
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
      }
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ state: true, history: [true] }));
    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    const call = ruleType.executor.mock.calls[0][0];
    expect(call.params).toEqual({ bar: true });
    expect(call.startedAt).toEqual(new Date(DATE_1970));
    expect(call.previousStartedAt).toEqual(new Date(DATE_1970_5_MIN));
    expect(call.state).toEqual({});
    expect(call.name).toBe(RULE_NAME);
    expect(call.tags).toEqual(['rule-', '-tags']);
    expect(call.createdBy).toBe('rule-creator');
    expect(call.updatedBy).toBe('rule-updater');
    expect(call.rule).not.toBe(null);
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

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":0,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({}));
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('successfully bails on execution if the rule is disabled', async () => {
    const state = {
      ...mockedTaskInstance.state,
      previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    };
    const taskRunner = new TaskRunner(
      ruleType,
      {
        ...mockedTaskInstance,
        state,
      },
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      ...SAVED_OBJECT,
      attributes: { ...SAVED_OBJECT.attributes, enabled: false },
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult.state.previousStartedAt?.toISOString()).toBe(state.previousStartedAt);
    expect(runnerResult.schedule).toStrictEqual(mockedTaskInstance.schedule);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        errorMessage: 'Rule failed to execute because rule ran after it was disabled.',
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'failure',
        task: true,
        reason: 'disabled',
        status: 'error',
      })
    );
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('successfully stores successful runs', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toEqual(generateRunnerResult({ state: true, history: [true] }));
  });

  test('successfully stores failure runs', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);
    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
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
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);
    await taskRunner.run();
    await taskRunner.run();
    await taskRunner.run();

    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
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

  test('caps monitoring history at 200', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue(SAVED_OBJECT);

    for (let i = 0; i < 300; i++) {
      await taskRunner.run();
    }
    const runnerResult = await taskRunner.run();
    expect(runnerResult.monitoring?.execution.history.length).toBe(200);
  });

  test('Actions circuit breaker kicked in, should set status as warning and log a message in event log', async () => {
    const actionsConfigMap = {
      default: {
        max: 3,
      },
    };

    const warning = {
      reason: AlertExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
      message: translations.taskRunner.warning.maxExecutableActions,
    };

    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);

    ruleType.executor.mockImplementation(
      async ({
        services: executorServices,
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        executorServices.alertFactory.create('1').scheduleActions('default');
      }
    );

    rulesClient.get.mockResolvedValue({
      ...mockedRuleTypeSavedObject,
      actions: [
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
      ],
    } as jest.ResolvedValue<unknown>);
    ruleTypeRegistry.get.mockReturnValue(ruleType);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(SAVED_OBJECT);

    const taskRunner = new TaskRunner(ruleType, mockedTaskInstance, {
      ...taskRunnerFactoryInitializerParams,
      actionsConfigMap,
    });

    const runnerResult = await taskRunner.run();

    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(actionsConfigMap.default.max);

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(...generateSavedObjectParams({ status: 'warning', warning }));

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
            },
            state: {
              duration: 0,
              start: '1970-01-01T00:00:00.000Z',
            },
          },
        },
      })
    );
    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(7);

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      1,
      generateEventLog({
        task: true,
        action: EVENT_LOG_ACTIONS.executeStart,
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      2,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.newInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      3,
      generateEventLog({
        duration: 0,
        start: DATE_1970,
        action: EVENT_LOG_ACTIONS.activeInstance,
        actionGroupId: 'default',
        instanceId: '1',
      })
    );

    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      4,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.executeAction,
        savedObjects: [generateAlertSO('1'), generateActionSO('1')],
        actionGroupId: 'default',
        instanceId: '1',
        actionId: '1',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      5,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.executeAction,
        savedObjects: [generateAlertSO('1'), generateActionSO('2')],
        actionGroupId: 'default',
        instanceId: '1',
        actionId: '2',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      6,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.executeAction,
        savedObjects: [generateAlertSO('1'), generateActionSO('3')],
        actionGroupId: 'default',
        instanceId: '1',
        actionId: '3',
      })
    );
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(
      7,
      generateEventLog({
        action: EVENT_LOG_ACTIONS.execute,
        outcome: 'success',
        status: 'warning',
        numberOfTriggeredActions: actionsConfigMap.default.max,
        reason: AlertExecutionStatusWarningReasons.MAX_EXECUTABLE_ACTIONS,
        task: true,
      })
    );
  });
});

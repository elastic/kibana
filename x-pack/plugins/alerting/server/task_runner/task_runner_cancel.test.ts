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
} from '../types';
import { ConcreteTaskInstance, TaskStatus } from '@kbn/task-manager-plugin/server';
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
import { Rule, RecoveredActionGroup } from '../../common';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { inMemoryMetricsMock } from '../monitoring/in_memory_metrics.mock';

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
}));
jest.mock('../lib/wrap_scoped_cluster_client', () => ({
  createWrappedScopedClusterClientFactory: jest.fn(),
}));

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  producer: 'alerts',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  config: {
    execution: {
      actions: { max: 1000 },
    },
  },
};

let fakeTimer: sinon.SinonFakeTimers;

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

describe('Task Runner Cancel', () => {
  let mockedTaskInstance: ConcreteTaskInstance;

  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
    mockedTaskInstance = {
      id: '',
      attempts: 0,
      status: TaskStatus.Running,
      version: '123',
      runAt: new Date(),
      schedule: { interval: '10s' },
      scheduledAt: new Date(),
      startedAt: new Date(),
      retryAt: new Date(Date.now() + 5 * 60 * 1000),
      state: {},
      taskType: 'alerting:test',
      params: {
        alertId: '1',
        spaceId: 'default',
        consumer: 'bar',
      },
      ownerId: null,
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
  };

  const mockDate = new Date('2019-02-12T21:01:22.479Z');

  const mockedRuleSavedObject: Rule<RuleTypeParams> = {
    id: '1',
    consumer: 'bar',
    createdAt: mockDate,
    updatedAt: mockDate,
    throttle: null,
    muteAll: false,
    notifyWhen: 'onActiveAlert',
    enabled: true,
    alertTypeId: ruleType.id,
    apiKey: '',
    apiKeyOwner: 'elastic',
    schedule: { interval: '10s' },
    name: 'rule-name',
    tags: ['rule-', '-tags'],
    createdBy: 'rule-creator',
    updatedBy: 'rule-updater',
    mutedInstanceIds: [],
    params: {
      bar: true,
    },
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
        group: RecoveredActionGroup.id,
        id: '2',
        actionTypeId: 'action',
        params: {
          isResolved: true,
        },
      },
    ],
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
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
    rulesClient.get.mockResolvedValue(mockedRuleSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
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
  });

  test('updates rule saved object execution status and writes to event log entry when task is cancelled mid-execution', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenNthCalledWith(
      3,
      `Aborting any in-progress ES searches for rule type test with id 1`
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    // execute-start event, timeout event and then an execute event because rule executors are not cancelling anything yet
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
      message: 'rule execution start: "1"',
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      event: {
        action: 'execute-timeout',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: `rule: test:1: '' execution cancelled due to timeout - exceeded rule type timeout of 5m`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
      event: {
        action: 'execute',
        category: ['alerts'],
        kind: 'alert',
        outcome: 'success',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              metrics: {
                number_of_searches: 3,
                number_of_triggered_actions: 0,
                number_of_generated_actions: 0,
                es_search_duration_ms: 33,
                total_search_duration_ms: 23423,
              },
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        alerting: {
          status: 'ok',
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
      message: `rule executed: test:1: 'rule-name'`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        ruleset: 'alerts',
      },
    });

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

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testActionsExecute();

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('actionsPlugin.execute is called if rule execution is cancelled but cancelAlertsOnRuleTimeout for ruleType is false', async () => {
    ruleTypeRegistry.get.mockReturnValue({
      ...ruleType,
      cancelAlertsOnRuleTimeout: false,
    });
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
      }
    );
    // setting cancelAlertsOnRuleTimeout for ruleType to false here
    const taskRunner = new TaskRunner(
      {
        ...ruleType,
        cancelAlertsOnRuleTimeout: false,
      },
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testActionsExecute();

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
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams,
      inMemoryMetrics
    );

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(7);
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
      `no scheduling of actions for rule test:1: 'rule-name': rule execution has been cancelled.`
    );
    expect(logger.debug).nthCalledWith(
      7,
      'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":0,"numberOfScheduledActions":0,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: `rule execution start: \"1\"`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      event: {
        action: 'execute-timeout',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: `rule: test:1: '' execution cancelled due to timeout - exceeded rule type timeout of 5m`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
      event: {
        action: 'execute',
        category: ['alerts'],
        kind: 'alert',
        outcome: 'success',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              metrics: {
                number_of_searches: 3,
                number_of_triggered_actions: 0,
                number_of_generated_actions: 0,
                es_search_duration_ms: 33,
                total_search_duration_ms: 23423,
              },
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        alerting: {
          status: 'active',
        },
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: "rule executed: test:1: 'rule-name'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        ruleset: 'alerts',
      },
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'alertsSkippedDueToRuleExecutionTimeout_test',
      incrementBy: 1,
    });
  });

  function testActionsExecute() {
    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(6);
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
      'ruleExecutionStatus for test:1: {"metrics":{"numSearches":3,"esSearchDurationMs":33,"totalSearchDurationMs":23423},"numberOfTriggeredActions":1,"numberOfScheduledActions":1,"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: `rule execution start: "1"`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      event: {
        action: 'execute-timeout',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: `rule: test:1: '' execution cancelled due to timeout - exceeded rule type timeout of 5m`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
      event: {
        action: 'new-instance',
        category: ['alerts'],
        kind: 'alert',
        duration: 0,
        start: '1970-01-01T00:00:00.000Z',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        alerting: {
          action_group_id: 'default',
          instance_id: '1',
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: "test:1: 'rule-name' created new alert: '1'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(4, {
      event: {
        action: 'active-instance',
        category: ['alerts'],
        duration: 0,
        kind: 'alert',
        start: '1970-01-01T00:00:00.000Z',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        alerting: {
          action_group_id: 'default',
          instance_id: '1',
        },
        saved_objects: [
          { id: '1', namespace: undefined, rel: 'primary', type: 'alert', type_id: 'test' },
        ],
        space_ids: ['default'],
      },
      message: "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(5, {
      event: {
        action: 'execute-action',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        alerting: {
          instance_id: '1',
          action_group_id: 'default',
        },
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
          {
            id: '1',
            type: 'action',
            type_id: 'action',
          },
        ],
        space_ids: ['default'],
      },
      message:
        "alert: test:1: 'rule-name' instanceId: '1' scheduled actionGroup: 'default' action: action:1",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(6, {
      event: { action: 'execute', category: ['alerts'], kind: 'alert', outcome: 'success' },
      kibana: {
        alert: {
          rule: {
            consumer: 'bar',
            execution: {
              metrics: {
                number_of_searches: 3,
                number_of_triggered_actions: 1,
                number_of_generated_actions: 1,
                es_search_duration_ms: 33,
                total_search_duration_ms: 23423,
              },
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
            rule_type_id: 'test',
          },
        },
        alerting: {
          status: 'active',
        },
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        space_ids: ['default'],
      },
      message: "rule executed: test:1: 'rule-name'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        ruleset: 'alerts',
      },
    });
  }
});

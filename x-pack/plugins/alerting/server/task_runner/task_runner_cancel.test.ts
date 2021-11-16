/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import {
  AlertExecutorOptions,
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
} from '../types';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager/server';
import { TaskRunnerContext } from './task_runner_factory';
import { TaskRunner } from './task_runner';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
  httpServiceMock,
  executionContextServiceMock,
} from '../../../../../src/core/server/mocks';
import { PluginStartContract as ActionsPluginStart } from '../../../actions/server';
import { actionsMock, actionsClientMock } from '../../../actions/server/mocks';
import { alertsMock, rulesClientMock } from '../mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { IEventLogger } from '../../../event_log/server';
import { Alert, RecoveredActionGroup } from '../../common';
import { UntypedNormalizedAlertType } from '../rule_type_registry';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';

const ruleType: jest.Mocked<UntypedNormalizedAlertType> = {
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
};

let fakeTimer: sinon.SinonFakeTimers;

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
      },
      ownerId: null,
    };
  });

  afterAll(() => fakeTimer.restore());

  const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
  const services = alertsMock.createAlertServices();
  const actionsClient = actionsClientMock.create();
  const rulesClient = rulesClientMock.create();
  const ruleTypeRegistry = ruleTypeRegistryMock.create();

  type TaskRunnerFactoryInitializerParamsType = jest.Mocked<TaskRunnerContext> & {
    actionsPlugin: jest.Mocked<ActionsPluginStart>;
    eventLogger: jest.Mocked<IEventLogger>;
    executionContext: ReturnType<typeof executionContextServiceMock.createInternalStartContract>;
  };

  const taskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType = {
    getServices: jest.fn().mockReturnValue(services),
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
    maxEphemeralActionsPerAlert: 10,
    cancelAlertsOnRuleTimeout: true,
  };

  const mockDate = new Date('2019-02-12T21:01:22.479Z');

  const mockedRuleSavedObject: Alert<AlertTypeParams> = {
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
    taskRunnerFactoryInitializerParams.getServices.mockReturnValue(services);
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
      taskRunnerFactoryInitializerParams
    );

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    // execute-start event, timeout event and then an execute event because rule executors are not cancelling anything yet
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
      message: 'alert execution start: "1"',
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-timeout',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
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
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute',
        category: ['alerts'],
        kind: 'alert',
        outcome: 'success',
      },
      kibana: {
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
        task: {
          schedule_delay: 0,
          scheduled: '1970-01-01T00:00:00.000Z',
        },
      },
      message: `alert executed: test:1: 'rule-name'`,
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
        },
      },
      { refresh: false, namespace: undefined }
    );
  });

  test('actionsPlugin.execute is called if rule execution is cancelled but cancelAlertsOnRuleTimeout from config is false', async () => {
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    // setting cancelAlertsOnRuleTimeout to false here
    const taskRunner = new TaskRunner(ruleType, mockedTaskInstance, {
      ...taskRunnerFactoryInitializerParams,
      cancelAlertsOnRuleTimeout: false,
    });

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testActionsExecute();
  });

  test('actionsPlugin.execute is called if rule execution is cancelled but cancelAlertsOnRuleTimeout for ruleType is false', async () => {
    ruleTypeRegistry.get.mockReturnValue({
      ...ruleType,
      cancelAlertsOnRuleTimeout: false,
    });
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    // setting cancelAlertsOnRuleTimeout for ruleType to false here
    const taskRunner = new TaskRunner(
      {
        ...ruleType,
        cancelAlertsOnRuleTimeout: false,
      },
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    testActionsExecute();
  });

  test('actionsPlugin.execute is skipped if rule execution is cancelled and cancelAlertsOnRuleTimeout for both config and ruleType are true', async () => {
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    const promise = taskRunner.run();
    await Promise.resolve();
    await taskRunner.cancel();
    await promise;

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(6);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `Cancelling rule type test with id 1 - execution exceeded rule type timeout of 5m`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `Updating rule task for test rule with id 1 - execution error due to timeout`
    );
    expect(logger.debug).nthCalledWith(
      4,
      `alert test:1: 'rule-name' has 1 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      5,
      `no scheduling of actions for alert test:1: 'rule-name': alert execution has been cancelled.`
    );
    expect(logger.debug).nthCalledWith(
      6,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
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
      },
      message: `alert execution start: \"1\"`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-timeout',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
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
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute',
        category: ['alerts'],
        kind: 'alert',
        outcome: 'success',
      },
      kibana: {
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
      },
      message: "alert executed: test:1: 'rule-name'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'rule-name',
        ruleset: 'alerts',
      },
    });
  });

  function testActionsExecute() {
    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `Cancelling rule type test with id 1 - execution exceeded rule type timeout of 5m`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `Updating rule task for test rule with id 1 - execution error due to timeout`
    );
    expect(logger.debug).nthCalledWith(
      4,
      `alert test:1: 'rule-name' has 1 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      5,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-start',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
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
      },
      message: `alert execution start: "1"`,
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: {
        action: 'execute-timeout',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
            type_id: 'test',
          },
        ],
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
      },
      message: "test:1: 'rule-name' created new instance: '1'",
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
        alerting: {
          action_group_id: 'default',
          instance_id: '1',
        },
        saved_objects: [
          { id: '1', namespace: undefined, rel: 'primary', type: 'alert', type_id: 'test' },
        ],
      },
      message: "test:1: 'rule-name' active instance: '1' in actionGroup: 'default'",
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
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: { action: 'execute', category: ['alerts'], kind: 'alert', outcome: 'success' },
      kibana: {
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
      },
      message: "alert executed: test:1: 'rule-name'",
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

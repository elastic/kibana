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
} from '../types';
import {
  ConcreteTaskInstance,
  isUnrecoverableError,
  RunNowResult,
  TaskStatus,
} from '../../../task_manager/server';
import { TaskRunnerContext } from './task_runner_factory';
import { TaskRunner, getDefaultRuleMonitoring } from './task_runner';
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
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { Alert, RecoveredActionGroup } from '../../common';
import { omit } from 'lodash';
import { UntypedNormalizedRuleType } from '../rule_type_registry';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { ExecuteOptions } from '../../../actions/server/create_execute_function';

jest.mock('uuid', () => ({
  v4: () => '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
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
};

let fakeTimer: sinon.SinonFakeTimers;

const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

describe('Task Runner', () => {
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
    maxEphemeralActionsPerRule: 10,
    cancelAlertsOnRuleTimeout: true,
    usageCounter: mockUsageCounter,
  };

  function testAgainstEphemeralSupport(
    name: string,
    fn: (
      params: TaskRunnerFactoryInitializerParamsType,
      enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
    ) => jest.ProvidesCallback
  ) {
    test(name, fn(taskRunnerFactoryInitializerParams, actionsClient.enqueueExecution));
    test(
      `${name} (with ephemeral support)`,
      fn(
        {
          ...taskRunnerFactoryInitializerParams,
          supportsEphemeralTasks: true,
        },
        actionsClient.ephemeralEnqueuedExecution
      )
    );
  }

  const mockDate = new Date('2019-02-12T21:01:22.479Z');

  const mockedRuleTypeSavedObject: Alert<AlertTypeParams> = {
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
    monitoring: getDefaultRuleMonitoring(),
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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
                                  Object {
                                    "monitoring": Object {
                                      "execution": Object {
                                        "calculated_metrics": Object {
                                          "success_ratio": 1,
                                        },
                                        "history": Array [
                                          Object {
                                            "success": true,
                                            "timestamp": 0,
                                          },
                                        ],
                                      },
                                    },
                                    "schedule": Object {
                                      "interval": "10s",
                                    },
                                    "state": Object {
                                      "alertInstances": Object {},
                                      "alertTypeState": undefined,
                                      "previousStartedAt": 1970-01-01T00:00:00.000Z,
                                    },
                                  }
                  `);
    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    const call = ruleType.executor.mock.calls[0][0];
    expect(call.params).toMatchInlineSnapshot(`
                                      Object {
                                        "bar": true,
                                      }
                    `);
    expect(call.startedAt).toMatchInlineSnapshot(`1970-01-01T00:00:00.000Z`);
    expect(call.previousStartedAt).toMatchInlineSnapshot(`1969-12-31T23:55:00.000Z`);
    expect(call.state).toMatchInlineSnapshot(`Object {}`);
    expect(call.name).toBe('rule-name');
    expect(call.tags).toEqual(['rule-', '-tags']);
    expect(call.createdBy).toBe('rule-creator');
    expect(call.updatedBy).toBe('rule-updater');
    expect(call.rule).not.toBe(null);
    expect(call.rule.name).toBe('rule-name');
    expect(call.rule.tags).toEqual(['rule-', '-tags']);
    expect(call.rule.consumer).toBe('bar');
    expect(call.rule.enabled).toBe(true);
    expect(call.rule.schedule).toMatchInlineSnapshot(`
          Object {
            "interval": "10s",
          }
        `);
    expect(call.rule.createdBy).toBe('rule-creator');
    expect(call.rule.updatedBy).toBe('rule-updater');
    expect(call.rule.createdAt).toBe(mockDate);
    expect(call.rule.updatedAt).toBe(mockDate);
    expect(call.rule.notifyWhen).toBe('onActiveAlert');
    expect(call.rule.throttle).toBe(null);
    expect(call.rule.producer).toBe('alerts');
    expect(call.rule.ruleTypeId).toBe('test');
    expect(call.rule.ruleTypeName).toBe('My test rule');
    expect(call.rule.actions).toMatchInlineSnapshot(`
          Array [
            Object {
              "actionTypeId": "action",
              "group": "default",
              "id": "1",
              "params": Object {
                "foo": true,
              },
            },
            Object {
              "actionTypeId": "action",
              "group": "recovered",
              "id": "2",
              "params": Object {
                "isResolved": true,
              },
            },
          ]
        `);
    expect(call.services.alertInstanceFactory).toBeTruthy();
    expect(call.services.scopedClusterClient).toBeTruthy();
    expect(call.services).toBeTruthy();

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'ruleExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "execute-start",
          "category": Array [
            "alerts",
          ],
          "kind": "alert",
        },
        "kibana": Object {
          "alert": Object {
            "rule": Object {
              "execution": Object {
                "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
              },
            },
          },
          "saved_objects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "rel": "primary",
              "type": "alert",
              "type_id": "test",
            },
          ],
          "task": Object {
            "schedule_delay": 0,
            "scheduled": "1970-01-01T00:00:00.000Z",
          },
        },
        "message": "rule execution start: \\"1\\"",
        "rule": Object {
          "category": "test",
          "id": "1",
          "license": "basic",
          "ruleset": "alerts",
        },
      }
    `);

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        monitoring: {
          execution: {
            calculated_metrics: {
              success_ratio: 1,
            },
            history: [
              {
                success: true,
                timestamp: 0,
              },
            ],
          },
        },
        executionStatus: {
          error: null,
          lastDuration: 0,
          lastExecutionDate: '1970-01-01T00:00:00.000Z',
          status: 'ok',
        },
      },
      { refresh: false, namespace: undefined }
    );

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
  });

  testAgainstEphemeralSupport(
    'actionsPlugin.execute is called per alert alert that is scheduled',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
          true
        );
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
          true
        );
        actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(new Promise(() => {}));
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
            executorServices
              .alertInstanceFactory('1')
              .scheduleActionsWithSubGroup('default', 'subDefault');
          }
        );
        const taskRunner = new TaskRunner(
          ruleType,
          mockedTaskInstance,
          customTaskRunnerFactoryInitializerParams
        );
        rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
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
        expect(enqueueFunction).toHaveBeenCalledTimes(1);
        expect((enqueueFunction as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
          "id": "1",
          "params": Object {
            "foo": true,
          },
          "relatedSavedObjects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "type": "alert",
              "typeId": "test",
            },
          ],
          "source": Object {
            "source": Object {
              "id": "1",
              "type": "alert",
            },
            "type": "SAVED_OBJECT",
          },
          "spaceId": undefined,
        },
      ]
    `);

        const logger = customTaskRunnerFactoryInitializerParams.logger;
        expect(logger.debug).toHaveBeenCalledTimes(4);
        expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
        expect(logger.debug).nthCalledWith(
          2,
          `rule test:1: 'rule-name' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );
        expect(logger.debug).nthCalledWith(
          3,
          'ruleExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
        );
        // ruleExecutionStatus for test:1: {\"lastExecutionDate\":\"1970-01-01T00:00:00.000Z\",\"status\":\"error\",\"error\":{\"reason\":\"unknown\",\"message\":\"Cannot read property 'catch' of undefined\"}}

        const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
          event: {
            action: 'execute-start',
            category: ['alerts'],
            kind: 'alert',
          },
          kibana: {
            alert: {
              rule: {
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
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
            action: 'new-instance',
            category: ['alerts'],
            kind: 'alert',
            duration: 0,
            start: '1970-01-01T00:00:00.000Z',
          },
          kibana: {
            alert: {
              rule: {
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
              },
            },
            alerting: {
              action_group_id: 'default',
              action_subgroup: 'subDefault',
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
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
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
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
              },
            },
            alerting: {
              action_group_id: 'default',
              action_subgroup: 'subDefault',
              instance_id: '1',
            },
            saved_objects: [
              { id: '1', namespace: undefined, rel: 'primary', type: 'alert', type_id: 'test' },
            ],
          },
          message:
            "test:1: 'rule-name' active alert: '1' in actionGroup(subgroup): 'default(subDefault)'",
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
            action: 'execute-action',
            category: ['alerts'],
            kind: 'alert',
          },
          kibana: {
            alert: {
              rule: {
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
              },
            },
            alerting: {
              instance_id: '1',
              action_group_id: 'default',
              action_subgroup: 'subDefault',
            },
            saved_objects: [
              {
                id: '1',
                namespace: undefined,
                rel: 'primary',
                type: 'alert',
                type_id: 'test',
              },
              {
                id: '1',
                namespace: undefined,
                type: 'action',
                type_id: 'action',
              },
            ],
          },
          message:
            "alert: test:1: 'rule-name' instanceId: '1' scheduled actionGroup(subgroup): 'default(subDefault)' action: action:1",
          rule: {
            category: 'test',
            id: '1',
            license: 'basic',
            name: 'rule-name',
            namespace: undefined,
            ruleset: 'alerts',
          },
        });
        expect(eventLogger.logEvent).toHaveBeenNthCalledWith(5, {
          event: { action: 'execute', category: ['alerts'], kind: 'alert', outcome: 'success' },
          kibana: {
            alert: {
              rule: {
                execution: {
                  uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
                },
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
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
    expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(5);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `rule test:1: 'rule-name' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `no scheduling of actions for rule test:1: 'rule-name': rule is muted.`
    );
    expect(logger.debug).nthCalledWith(
      4,
      'ruleExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
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
        alert: {
          rule: {
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
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
        action: 'new-instance',
        category: ['alerts'],
        kind: 'alert',
        duration: 0,
        start: '1970-01-01T00:00:00.000Z',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
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
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
      event: {
        action: 'active-instance',
        category: ['alerts'],
        kind: 'alert',
        duration: 0,
        start: '1970-01-01T00:00:00.000Z',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
          },
        },
        alerting: {
          instance_id: '1',
          action_group_id: 'default',
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
      message: "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
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
        action: 'execute',
        category: ['alerts'],
        kind: 'alert',
        outcome: 'success',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
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
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  testAgainstEphemeralSupport(
    'skips firing actions for active alert if alert is muted',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
          true
        );
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
          true
        );
        actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(new Promise(() => {}));
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
            executorServices.alertInstanceFactory('2').scheduleActions('default');
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
        expect(enqueueFunction).toHaveBeenCalledTimes(1);

        const logger = customTaskRunnerFactoryInitializerParams.logger;
        expect(logger.debug).toHaveBeenCalledTimes(5);
        expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
        expect(logger.debug).nthCalledWith(
          2,
          `rule test:1: 'rule-name' has 2 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"}]`
        );
        expect(logger.debug).nthCalledWith(
          3,
          `skipping scheduling of actions for '2' in rule test:1: 'rule-name': rule is muted`
        );
        expect(logger.debug).nthCalledWith(
          4,
          'ruleExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
        );
        expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      }
  );

  test('actionsPlugin.execute is not called when notifyWhen=onActionGroupChange and alert alert state does not change', async () => {
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
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
                lastScheduledActions: { date: '1970-01-01T00:00:00.000Z', group: 'default' },
              },
              state: {
                bar: false,
                start: '1969-12-31T00:00:00.000Z',
                duration: 86400000000000,
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
    expect(actionsClient.ephemeralEnqueuedExecution).toHaveBeenCalledTimes(0);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 86400000000000,
              "kind": "alert",
              "start": "1969-12-31T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  testAgainstEphemeralSupport(
    'actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert alert state has changed',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
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
            executorServices.alertInstanceFactory('1').scheduleActions('default');
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
        expect(enqueueFunction).toHaveBeenCalledTimes(1);
        expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      }
  );

  testAgainstEphemeralSupport(
    'actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert state subgroup has changed',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
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
            executorServices
              .alertInstanceFactory('1')
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
        expect(enqueueFunction).toHaveBeenCalledTimes(1);
        expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      }
  );

  testAgainstEphemeralSupport(
    'includes the apiKey in the request used to initialize the actionsClient',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
          true
        );
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
          true
        );
        actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(new Promise(() => {}));
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
          customTaskRunnerFactoryInitializerParams
        );
        rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
          id: '1',
          type: 'alert',
          attributes: {
            apiKey: Buffer.from('123:abc').toString('base64'),
            enabled: true,
          },
          references: [],
        });
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
        expect((enqueueFunction as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
          "id": "1",
          "params": Object {
            "foo": true,
          },
          "relatedSavedObjects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "type": "alert",
              "typeId": "test",
            },
          ],
          "source": Object {
            "source": Object {
              "id": "1",
              "type": "alert",
            },
            "type": "SAVED_OBJECT",
          },
          "spaceId": undefined,
        },
      ]
    `);

        const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
        expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
        expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "new-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 0,
              "kind": "alert",
              "start": "1970-01-01T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' created new alert: '1'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 0,
              "kind": "alert",
              "start": "1970-01-01T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute-action",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "type": "action",
                  "type_id": "action",
                },
              ],
            },
            "message": "alert: test:1: 'rule-name' instanceId: '1' scheduled actionGroup: 'default' action: action:1",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
        expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      }
  );

  testAgainstEphemeralSupport(
    'fire recovered actions for execution for the alertInstances which is in the recovered state',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
          true
        );
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
          true
        );
        actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(new Promise(() => {}));

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
          {
            ...mockedTaskInstance,
            state: {
              ...mockedTaskInstance.state,
              alertInstances: {
                '1': {
                  meta: {},
                  state: {
                    bar: false,
                    start: '1969-12-31T00:00:00.000Z',
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
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
          id: '1',
          type: 'alert',
          attributes: {
            apiKey: Buffer.from('123:abc').toString('base64'),
            enabled: true,
          },
          references: [],
        });
        const runnerResult = await taskRunner.run();
        expect(runnerResult.state.alertInstances).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "lastScheduledActions": Object {
                "date": 1970-01-01T00:00:00.000Z,
                "group": "default",
                "subgroup": undefined,
              },
            },
            "state": Object {
              "bar": false,
              "duration": 86400000000000,
              "start": "1969-12-31T00:00:00.000Z",
            },
          },
        }
        `);

        const logger = customTaskRunnerFactoryInitializerParams.logger;
        expect(logger.debug).toHaveBeenCalledTimes(5);
        expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
        expect(logger.debug).nthCalledWith(
          2,
          `rule test:1: 'rule-name' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );
        expect(logger.debug).nthCalledWith(
          3,
          `rule test:1: 'rule-name' has 1 recovered alerts: [\"2\"]`
        );
        expect(logger.debug).nthCalledWith(
          4,
          'ruleExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
        );

        const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
        expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
        expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "recovered-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 64800000000000,
              "end": "1970-01-01T00:00:00.000Z",
              "kind": "alert",
              "start": "1969-12-31T06:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' alert '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 86400000000000,
              "kind": "alert",
              "start": "1969-12-31T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute-action",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "recovered",
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
                Object {
                  "id": "2",
                  "namespace": undefined,
                  "type": "action",
                  "type_id": "action",
                },
              ],
            },
            "message": "alert: test:1: 'rule-name' instanceId: '2' scheduled actionGroup: 'recovered' action: action:2",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute-action",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "type": "action",
                  "type_id": "action",
                },
              ],
            },
            "message": "alert: test:1: 'rule-name' instanceId: '1' scheduled actionGroup: 'default' action: action:1",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);

        expect(enqueueFunction).toHaveBeenCalledTimes(2);
        expect((enqueueFunction as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
          "id": "2",
          "params": Object {
            "isResolved": true,
          },
          "relatedSavedObjects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "type": "alert",
              "typeId": "test",
            },
          ],
          "source": Object {
            "source": Object {
              "id": "1",
              "type": "alert",
            },
            "type": "SAVED_OBJECT",
          },
          "spaceId": undefined,
        },
      ]
    `);
        expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      }
  );

  testAgainstEphemeralSupport(
    'should skip alertInstances which werent active on the previous execution',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
        const alertId = 'e558aaad-fd81-46d2-96fc-3bd8fc3dc03f';
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
          true
        );
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
          true
        );
        actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(new Promise(() => {}));

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

            // create an instance, but don't schedule any actions, so it doesn't go active
            executorServices.alertInstanceFactory('3');
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
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
          id: alertId,
          type: 'alert',
          attributes: {
            apiKey: Buffer.from('123:abc').toString('base64'),
            enabled: true,
          },
          references: [],
        });
        const runnerResult = await taskRunner.run();
        expect(runnerResult.state.alertInstances).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "lastScheduledActions": Object {
              "date": 1970-01-01T00:00:00.000Z,
              "group": "default",
              "subgroup": undefined,
            },
          },
          "state": Object {
            "bar": false,
          },
        },
      }
    `);

        const logger = customTaskRunnerFactoryInitializerParams.logger;
        expect(logger.debug).toHaveBeenCalledWith(
          `rule test:${alertId}: 'rule-name' has 1 active alerts: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
        );

        expect(logger.debug).nthCalledWith(
          3,
          `rule test:${alertId}: 'rule-name' has 1 recovered alerts: [\"2\"]`
        );
        expect(logger.debug).nthCalledWith(
          4,
          `ruleExecutionStatus for test:${alertId}: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}`
        );

        const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
        expect(enqueueFunction).toHaveBeenCalledTimes(2);
        expect((enqueueFunction as jest.Mock).mock.calls[1][0].id).toEqual('1');
        expect((enqueueFunction as jest.Mock).mock.calls[0][0].id).toEqual('2');
        expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
      }
  );

  testAgainstEphemeralSupport(
    'fire actions under a custom recovery group when specified on an alert type for alertInstances which are in the recovered state',
    (
        customTaskRunnerFactoryInitializerParams: TaskRunnerFactoryInitializerParamsType,
        enqueueFunction: (options: ExecuteOptions) => Promise<void | RunNowResult>
      ) =>
      async () => {
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(
          true
        );
        customTaskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(
          true
        );

        actionsClient.ephemeralEnqueuedExecution.mockResolvedValue(new Promise(() => {}));

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
            executorServices.alertInstanceFactory('1').scheduleActions('default');
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
        encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
          id: '1',
          type: 'alert',
          attributes: {
            apiKey: Buffer.from('123:abc').toString('base64'),
            enabled: true,
          },
          references: [],
        });
        const runnerResult = await taskRunner.run();
        expect(runnerResult.state.alertInstances).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "lastScheduledActions": Object {
              "date": 1970-01-01T00:00:00.000Z,
              "group": "default",
              "subgroup": undefined,
            },
          },
          "state": Object {
            "bar": false,
          },
        },
      }
    `);

        const eventLogger = customTaskRunnerFactoryInitializerParams.eventLogger;
        expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
        expect(enqueueFunction).toHaveBeenCalledTimes(2);
        expect((enqueueFunction as jest.Mock).mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "executionId": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
          "id": "2",
          "params": Object {
            "isResolved": true,
          },
          "relatedSavedObjects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "type": "alert",
              "typeId": "test",
            },
          ],
          "source": Object {
            "source": Object {
              "id": "1",
              "type": "alert",
            },
            "type": "SAVED_OBJECT",
          },
          "spaceId": undefined,
        },
      ]
    `);
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
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
                start: '1969-12-31T00:00:00.000Z',
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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult.state.alertInstances).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "lastScheduledActions": Object {
              "date": 1970-01-01T00:00:00.000Z,
              "group": "default",
              "subgroup": undefined,
            },
          },
          "state": Object {
            "bar": false,
            "duration": 86400000000000,
            "start": "1969-12-31T00:00:00.000Z",
          },
        },
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "recovered-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 64800000000000,
              "end": "1970-01-01T00:00:00.000Z",
              "kind": "alert",
              "start": "1969-12-31T06:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' alert '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 86400000000000,
              "kind": "alert",
              "start": "1969-12-31T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);
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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    await taskRunner.run();
    expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          // base64 encoded "123:abc"
          authorization: 'ApiKey MTIzOmFiYw==',
        },
      })
    );
    const [request] = taskRunnerFactoryInitializerParams.getServices.mock.calls[0];

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
      id: '1',
      type: 'alert',
      attributes: {
        enabled: true,
      },
      references: [],
    });

    await taskRunner.run();

    expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {},
      })
    );

    const [request] = taskRunnerFactoryInitializerParams.getServices.mock.calls[0];

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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 1,
            },
            "history": Array [
              Object {
                "success": true,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "30s",
        },
        "state": Object {
          "alertInstances": Object {},
          "alertTypeState": undefined,
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);
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
        throw new Error('OMG');
      }
    );

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "error": Object {
              "message": "OMG",
            },
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "failure",
              "reason": "execute",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "error",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution failure: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching the encrypted attributes', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "error": Object {
              "message": "OMG",
            },
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "failure",
              "reason": "decrypt",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "error",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when license is higher than supported', async () => {
    ruleTypeRegistry.ensureRuleTypeEnabled.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "error": Object {
              "message": "OMG",
            },
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "failure",
              "reason": "license",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "error",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when getting internal Services', async () => {
    taskRunnerFactoryInitializerParams.getServices.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "error": Object {
              "message": "OMG",
            },
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "failure",
              "reason": "unknown",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "error",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching attributes', async () => {
    rulesClient.get.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "error": Object {
              "message": "OMG",
            },
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "failure",
              "reason": "read",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "error",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('recovers gracefully when the Runner of a legacy Alert task which has no schedule throws an exception when fetching attributes', async () => {
    rulesClient.get.mockImplementation(() => {
      throw new Error('OMG');
    });

    // legacy alerts used to run by returning a new `runAt` instead of using a schedule
    // ensure we return a fallback schedule when this happens, otherwise the task might be deleted
    const legacyTaskInstance = omit(mockedTaskInstance, 'schedule');

    const taskRunner = new TaskRunner(
      ruleType,
      legacyTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "monitoring": Object {
          "execution": Object {
            "calculated_metrics": Object {
              "success_ratio": 0,
            },
            "history": Array [
              Object {
                "success": false,
                "timestamp": 0,
              },
            ],
          },
        },
        "schedule": Object {
          "interval": "5m",
        },
        "state": Object {},
      }
    `);
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test(`doesn't change previousStartedAt when it fails to run`, async () => {
    const originalAlertSate = {
      previousStartedAt: '1970-01-05T00:00:00.000Z',
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
        throw new Error('OMG');
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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

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

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const logger = taskRunnerFactoryInitializerParams.logger;
    return taskRunner.run().catch((ex) => {
      expect(ex).toMatchInlineSnapshot(`[Error: Saved object [alert/1] not found]`);
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

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

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

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

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

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    const logger = taskRunnerFactoryInitializerParams.logger;
    return taskRunner.run().catch((ex) => {
      expect(ex).toMatchInlineSnapshot(`[Error: Saved object [alert/1] not found]`);
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
        executorServices.alertInstanceFactory('2').scheduleActions('default');
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(6);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "new-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 0,
              "kind": "alert",
              "start": "1970-01-01T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' created new alert: '1'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "new-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 0,
              "kind": "alert",
              "start": "1970-01-01T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' created new alert: '2'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 0,
              "kind": "alert",
              "start": "1970-01-01T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 0,
              "kind": "alert",
              "start": "1970-01-01T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '2' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
        executorServices.alertInstanceFactory('2').scheduleActions('default');
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
                start: '1969-12-31T00:00:00.000Z',
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 86400000000000,
              "kind": "alert",
              "start": "1969-12-31T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 64800000000000,
              "kind": "alert",
              "start": "1969-12-31T06:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '2' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
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
        executorServices.alertInstanceFactory('1').scheduleActions('default');
        executorServices.alertInstanceFactory('2').scheduleActions('default');
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "active-instance",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "action_group_id": "default",
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' active alert: '2' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "active",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
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
                start: '1969-12-31T00:00:00.000Z',
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "recovered-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 86400000000000,
              "end": "1970-01-01T00:00:00.000Z",
              "kind": "alert",
              "start": "1969-12-31T00:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' alert '1' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "recovered-instance",
              "category": Array [
                "alerts",
              ],
              "duration": 64800000000000,
              "end": "1970-01-01T00:00:00.000Z",
              "kind": "alert",
              "start": "1969-12-31T06:00:00.000Z",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' alert '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "ok",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute-start",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule execution start: \\"1\\"",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "recovered-instance",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "instance_id": "1",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' alert '1' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "recovered-instance",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "instance_id": "2",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
            },
            "message": "test:1: 'rule-name' alert '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
              "alert": Object {
                "rule": Object {
                  "execution": Object {
                    "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
                  },
                },
              },
              "alerting": Object {
                "status": "ok",
              },
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                  "type_id": "test",
                },
              ],
              "task": Object {
                "schedule_delay": 0,
                "scheduled": "1970-01-01T00:00:00.000Z",
              },
            },
            "message": "rule executed: test:1: 'rule-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "rule-name",
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
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
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
                                  Object {
                                    "monitoring": Object {
                                      "execution": Object {
                                        "calculated_metrics": Object {
                                          "success_ratio": 1,
                                        },
                                        "history": Array [
                                          Object {
                                            "success": true,
                                            "timestamp": 0,
                                          },
                                        ],
                                      },
                                    },
                                    "schedule": Object {
                                      "interval": "10s",
                                    },
                                    "state": Object {
                                      "alertInstances": Object {},
                                      "alertTypeState": undefined,
                                      "previousStartedAt": 1970-01-01T00:00:00.000Z,
                                    },
                                  }
                  `);
    expect(ruleType.executor).toHaveBeenCalledTimes(1);
    const call = ruleType.executor.mock.calls[0][0];
    expect(call.params).toMatchInlineSnapshot(`
                                      Object {
                                        "bar": true,
                                      }
                    `);
    expect(call.startedAt).toMatchInlineSnapshot(`1970-01-01T00:00:00.000Z`);
    expect(call.previousStartedAt).toMatchInlineSnapshot(`1969-12-31T23:55:00.000Z`);
    expect(call.state).toMatchInlineSnapshot(`Object {}`);
    expect(call.name).toBe('rule-name');
    expect(call.tags).toEqual(['rule-', '-tags']);
    expect(call.createdBy).toBe('rule-creator');
    expect(call.updatedBy).toBe('rule-updater');
    expect(call.rule).not.toBe(null);
    expect(call.rule.name).toBe('rule-name');
    expect(call.rule.tags).toEqual(['rule-', '-tags']);
    expect(call.rule.consumer).toBe('bar');
    expect(call.rule.enabled).toBe(true);
    expect(call.rule.schedule).toMatchInlineSnapshot(`
          Object {
            "interval": "10s",
          }
        `);
    expect(call.rule.createdBy).toBe('rule-creator');
    expect(call.rule.updatedBy).toBe('rule-updater');
    expect(call.rule.createdAt).toBe(mockDate);
    expect(call.rule.updatedAt).toBe(mockDate);
    expect(call.rule.notifyWhen).toBe('onActiveAlert');
    expect(call.rule.throttle).toBe(null);
    expect(call.rule.producer).toBe('alerts');
    expect(call.rule.ruleTypeId).toBe('test');
    expect(call.rule.ruleTypeName).toBe('My test rule');
    expect(call.rule.actions).toMatchInlineSnapshot(`
          Array [
            Object {
              "actionTypeId": "action",
              "group": "default",
              "id": "1",
              "params": Object {
                "foo": true,
              },
            },
            Object {
              "actionTypeId": "action",
              "group": "recovered",
              "id": "2",
              "params": Object {
                "isResolved": true,
              },
            },
          ]
        `);
    expect(call.services.alertInstanceFactory).toBeTruthy();
    expect(call.services.scopedClusterClient).toBeTruthy();
    expect(call.services).toBeTruthy();

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).nthCalledWith(1, 'executing rule test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'ruleExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.startTiming).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "execute-start",
          "category": Array [
            "alerts",
          ],
          "kind": "alert",
        },
        "kibana": Object {
          "alert": Object {
            "rule": Object {
              "execution": Object {
                "uuid": "5f6aa57d-3e22-484e-bae8-cbed868f4d28",
              },
            },
          },
          "saved_objects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "rel": "primary",
              "type": "alert",
              "type_id": "test",
            },
          ],
          "task": Object {
            "schedule_delay": 0,
            "scheduled": "1970-01-01T00:00:00.000Z",
          },
        },
        "message": "rule execution start: \\"1\\"",
        "rule": Object {
          "category": "test",
          "id": "1",
          "license": "basic",
          "ruleset": "alerts",
        },
      }
    `);

    expect(
      taskRunnerFactoryInitializerParams.internalSavedObjectsRepository.update
    ).toHaveBeenCalledWith(
      'alert',
      '1',
      {
        monitoring: {
          execution: {
            calculated_metrics: {
              success_ratio: 1,
            },
            history: [
              {
                success: true,
                timestamp: 0,
              },
            ],
          },
        },
        executionStatus: {
          error: null,
          lastDuration: 0,
          lastExecutionDate: '1970-01-01T00:00:00.000Z',
          status: 'ok',
        },
      },
      { refresh: false, namespace: undefined }
    );
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
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: false,
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult.state.previousStartedAt?.toISOString()).toBe(state.previousStartedAt);
    expect(runnerResult.schedule).toStrictEqual(mockedTaskInstance.schedule);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.logEvent.mock.calls[0][0]).toStrictEqual({
      event: {
        action: 'execute-start',
        kind: 'alert',
        category: ['alerts'],
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
          },
        },
        saved_objects: [
          { rel: 'primary', type: 'alert', id: '1', namespace: undefined, type_id: 'test' },
        ],
        task: { scheduled: '1970-01-01T00:00:00.000Z', schedule_delay: 0 },
      },
      rule: {
        id: '1',
        license: 'basic',
        category: 'test',
        ruleset: 'alerts',
      },
      message: 'rule execution start: "1"',
    });
    expect(eventLogger.logEvent.mock.calls[1][0]).toStrictEqual({
      event: {
        action: 'execute',
        kind: 'alert',
        category: ['alerts'],
        reason: 'disabled',
        outcome: 'failure',
      },
      kibana: {
        alert: {
          rule: {
            execution: {
              uuid: '5f6aa57d-3e22-484e-bae8-cbed868f4d28',
            },
          },
        },
        saved_objects: [
          { rel: 'primary', type: 'alert', id: '1', namespace: undefined, type_id: 'test' },
        ],
        task: {
          scheduled: '1970-01-01T00:00:00.000Z',
          schedule_delay: 0,
        },
        alerting: { status: 'error' },
      },
      rule: {
        id: '1',
        license: 'basic',
        category: 'test',
        ruleset: 'alerts',
      },
      error: {
        message: 'Rule failed to execute because rule ran after it was disabled.',
      },
      message: 'test:1: execution failed',
    });
    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  test('successfully stores successful runs', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
                                    Object {
                                      "monitoring": Object {
                                        "execution": Object {
                                          "calculated_metrics": Object {
                                            "success_ratio": 1,
                                          },
                                          "history": Array [
                                            Object {
                                              "success": true,
                                              "timestamp": 0,
                                            },
                                          ],
                                        },
                                      },
                                      "schedule": Object {
                                        "interval": "10s",
                                      },
                                      "state": Object {
                                        "alertInstances": Object {},
                                        "alertTypeState": undefined,
                                        "previousStartedAt": 1970-01-01T00:00:00.000Z,
                                      },
                                    }
                    `);
  });

  test('successfully stores failure runs', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
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
        throw new Error('OMG');
      }
    );
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
                                    Object {
                                      "monitoring": Object {
                                        "execution": Object {
                                          "calculated_metrics": Object {
                                            "success_ratio": 0,
                                          },
                                          "history": Array [
                                            Object {
                                              "success": false,
                                              "timestamp": 0,
                                            },
                                          ],
                                        },
                                      },
                                      "schedule": Object {
                                        "interval": "10s",
                                      },
                                      "state": Object {},
                                    }
                    `);
  });

  test('successfully stores the success ratio', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
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
      }: AlertExecutorOptions<
        AlertTypeParams,
        AlertTypeState,
        AlertInstanceState,
        AlertInstanceContext,
        string
      >) => {
        throw new Error('OMG');
      }
    );
    const runnerResult = await taskRunner.run();
    ruleType.executor.mockClear();
    expect(runnerResult).toMatchInlineSnapshot(`
                                    Object {
                                      "monitoring": Object {
                                        "execution": Object {
                                          "calculated_metrics": Object {
                                            "success_ratio": 0.75,
                                          },
                                          "history": Array [
                                            Object {
                                              "success": true,
                                              "timestamp": 0,
                                            },
                                            Object {
                                              "success": true,
                                              "timestamp": 0,
                                            },
                                            Object {
                                              "success": true,
                                              "timestamp": 0,
                                            },
                                            Object {
                                              "success": false,
                                              "timestamp": 0,
                                            },
                                          ],
                                        },
                                      },
                                      "schedule": Object {
                                        "interval": "10s",
                                      },
                                      "state": Object {},
                                    }
                    `);
  });

  test('caps monitoring history at 200', async () => {
    const taskRunner = new TaskRunner(
      ruleType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    rulesClient.get.mockResolvedValue(mockedRuleTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
        enabled: true,
      },
      references: [],
    });

    for (let i = 0; i < 300; i++) {
      await taskRunner.run();
    }
    const runnerResult = await taskRunner.run();
    expect(runnerResult.monitoring?.execution.history.length).toBe(200);
  });
});

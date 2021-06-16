/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { schema } from '@kbn/config-schema';
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
  TaskStatus,
} from '../../../task_manager/server';
import { TaskRunnerContext } from './task_runner_factory';
import { TaskRunner } from './task_runner';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import {
  loggingSystemMock,
  savedObjectsRepositoryMock,
  httpServiceMock,
} from '../../../../../src/core/server/mocks';
import { PluginStartContract as ActionsPluginStart } from '../../../actions/server';
import { actionsMock, actionsClientMock } from '../../../actions/server/mocks';
import { alertsMock, alertsClientMock } from '../mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { IEventLogger } from '../../../event_log/server';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { Alert, RecoveredActionGroup } from '../../common';
import { omit } from 'lodash';
import { UntypedNormalizedAlertType } from '../alert_type_registry';
import { alertTypeRegistryMock } from '../alert_type_registry.mock';

const alertType: jest.Mocked<UntypedNormalizedAlertType> = {
  id: 'test',
  name: 'My test alert',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  producer: 'alerts',
};

let fakeTimer: sinon.SinonFakeTimers;

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
  const alertsClient = alertsClientMock.create();
  const alertTypeRegistry = alertTypeRegistryMock.create();

  const taskRunnerFactoryInitializerParams: jest.Mocked<TaskRunnerContext> & {
    actionsPlugin: jest.Mocked<ActionsPluginStart>;
    eventLogger: jest.Mocked<IEventLogger>;
  } = {
    getServices: jest.fn().mockReturnValue(services),
    actionsPlugin: actionsMock.createStart(),
    getAlertsClientWithRequest: jest.fn().mockReturnValue(alertsClient),
    encryptedSavedObjectsClient,
    logger: loggingSystemMock.create().get(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    basePathService: httpServiceMock.createBasePath(),
    eventLogger: eventLoggerMock.create(),
    internalSavedObjectsRepository: savedObjectsRepositoryMock.create(),
    alertTypeRegistry,
    kibanaBaseUrl: 'https://localhost:5601',
  };

  const mockDate = new Date('2019-02-12T21:01:22.479Z');

  const mockedAlertTypeSavedObject: Alert<AlertTypeParams> = {
    id: '1',
    consumer: 'bar',
    createdAt: mockDate,
    updatedAt: mockDate,
    throttle: null,
    muteAll: false,
    notifyWhen: 'onActiveAlert',
    enabled: true,
    alertTypeId: alertType.id,
    apiKey: '',
    apiKeyOwner: 'elastic',
    schedule: { interval: '10s' },
    name: 'alert-name',
    tags: ['alert-', '-tags'],
    createdBy: 'alert-creator',
    updatedBy: 'alert-updater',
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
    taskRunnerFactoryInitializerParams.getAlertsClientWithRequest.mockReturnValue(alertsClient);
    taskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest.mockResolvedValue(
      actionsClient
    );
    taskRunnerFactoryInitializerParams.actionsPlugin.renderActionParameterTemplates.mockImplementation(
      (actionTypeId, actionId, params) => params
    );
    alertTypeRegistry.get.mockReturnValue(alertType);
  });

  test('successfully executes the task', async () => {
    const taskRunner = new TaskRunner(
      alertType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          previousStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
      },
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    const runnerResult = await taskRunner.run();
    expect(runnerResult).toMatchInlineSnapshot(`
                                  Object {
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
    expect(alertType.executor).toHaveBeenCalledTimes(1);
    const call = alertType.executor.mock.calls[0][0];
    expect(call.params).toMatchInlineSnapshot(`
                                      Object {
                                        "bar": true,
                                      }
                    `);
    expect(call.startedAt).toMatchInlineSnapshot(`1970-01-01T00:00:00.000Z`);
    expect(call.previousStartedAt).toMatchInlineSnapshot(`1969-12-31T23:55:00.000Z`);
    expect(call.state).toMatchInlineSnapshot(`Object {}`);
    expect(call.name).toBe('alert-name');
    expect(call.tags).toEqual(['alert-', '-tags']);
    expect(call.createdBy).toBe('alert-creator');
    expect(call.updatedBy).toBe('alert-updater');
    expect(call.rule).not.toBe(null);
    expect(call.rule.name).toBe('alert-name');
    expect(call.rule.tags).toEqual(['alert-', '-tags']);
    expect(call.rule.consumer).toBe('bar');
    expect(call.rule.enabled).toBe(true);
    expect(call.rule.schedule).toMatchInlineSnapshot(`
    Object {
      "interval": "10s",
    }
    `);
    expect(call.rule.createdBy).toBe('alert-creator');
    expect(call.rule.updatedBy).toBe('alert-updater');
    expect(call.rule.createdAt).toBe(mockDate);
    expect(call.rule.updatedAt).toBe(mockDate);
    expect(call.rule.notifyWhen).toBe('onActiveAlert');
    expect(call.rule.throttle).toBe(null);
    expect(call.rule.producer).toBe('alerts');
    expect(call.rule.ruleTypeId).toBe('test');
    expect(call.rule.ruleTypeName).toBe('My test alert');
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
    expect(logger.debug).toHaveBeenCalledTimes(2);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"ok"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "@timestamp": "1970-01-01T00:00:00.000Z",
        "event": Object {
          "action": "execute",
          "category": Array [
            "alerts",
          ],
          "kind": "alert",
          "outcome": "success",
        },
        "kibana": Object {
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
        },
        "message": "alert executed: test:1: 'alert-name'",
        "rule": Object {
          "category": "test",
          "id": "1",
          "license": "basic",
          "name": "alert-name",
          "namespace": undefined,
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
        executionStatus: {
          error: null,
          lastExecutionDate: '1970-01-01T00:00:00.000Z',
          status: 'ok',
        },
      },
      { refresh: false, namespace: undefined }
    );
  });

  test('actionsPlugin.execute is called per alert instance that is scheduled', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "id": "1",
          "params": Object {
            "foo": true,
          },
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

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(3);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `alert test:1: 'alert-name' has 1 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
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
      message: "test:1: 'alert-name' created new instance: '1'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      event: {
        action: 'active-instance',
        category: ['alerts'],
        duration: 0,
        kind: 'alert',
        start: '1970-01-01T00:00:00.000Z',
      },
      kibana: {
        alerting: { action_group_id: 'default', action_subgroup: 'subDefault', instance_id: '1' },
        saved_objects: [
          { id: '1', namespace: undefined, rel: 'primary', type: 'alert', type_id: 'test' },
        ],
      },
      message:
        "test:1: 'alert-name' active instance: '1' in actionGroup(subgroup): 'default(subDefault)'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(3, {
      event: {
        action: 'execute-action',
        category: ['alerts'],
        kind: 'alert',
      },
      kibana: {
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
        "alert: test:1: 'alert-name' instanceId: '1' scheduled actionGroup(subgroup): 'default(subDefault)' action: action:1",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(4, {
      '@timestamp': '1970-01-01T00:00:00.000Z',
      event: { action: 'execute', category: ['alerts'], kind: 'alert', outcome: 'success' },
      kibana: {
        alerting: {
          status: 'active',
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
      message: "alert executed: test:1: 'alert-name'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
  });

  test('actionsPlugin.execute is skipped if muteAll is true', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      muteAll: true,
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(0);

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(4);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `alert test:1: 'alert-name' has 1 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `no scheduling of actions for alert test:1: 'alert-name': alert is muted.`
    );
    expect(logger.debug).nthCalledWith(
      4,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(1, {
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
      message: "test:1: 'alert-name' created new instance: '1'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
    expect(eventLogger.logEvent).toHaveBeenNthCalledWith(2, {
      event: {
        action: 'active-instance',
        category: ['alerts'],
        kind: 'alert',
        duration: 0,
        start: '1970-01-01T00:00:00.000Z',
      },
      kibana: {
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
      message: "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
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
      message: "alert executed: test:1: 'alert-name'",
      rule: {
        category: 'test',
        id: '1',
        license: 'basic',
        name: 'alert-name',
        namespace: undefined,
        ruleset: 'alerts',
      },
    });
  });

  test('skips firing actions for active instance if instance is muted', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      mutedInstanceIds: ['2'],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(4);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `alert test:1: 'alert-name' has 2 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"},{\"instanceId\":\"2\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `skipping scheduling of actions for '2' in alert test:1: 'alert-name': instance is muted`
    );
    expect(logger.debug).nthCalledWith(
      4,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );
  });

  test('actionsPlugin.execute is not called when notifyWhen=onActionGroupChange and alert instance state does not change', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
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
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(0);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert instance state has changed', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {
            '1': {
              meta: { lastScheduledActions: { group: 'newGroup', date: new Date().toISOString() } },
              state: { bar: false },
            },
          },
        },
      },
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('actionsPlugin.execute is called when notifyWhen=onActionGroupChange and alert instance state subgroup has changed', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
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
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
  });

  test('includes the apiKey in the request used to initialize the actionsClient', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();
    expect(
      taskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: {
          // base64 encoded "123:abc"
          authorization: 'ApiKey MTIzOmFiYw==',
        },
      })
    );

    const [
      request,
    ] = taskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest.mock.calls[0];

    expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
      request,
      '/'
    );

    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "id": "1",
          "params": Object {
            "foo": true,
          },
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(4);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
    Array [
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
          "message": "test:1: 'alert-name' created new instance: '1'",
          "rule": Object {
            "category": "test",
            "id": "1",
            "license": "basic",
            "name": "alert-name",
            "namespace": undefined,
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
          "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
          "rule": Object {
            "category": "test",
            "id": "1",
            "license": "basic",
            "name": "alert-name",
            "namespace": undefined,
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
            "alerting": Object {
              "action_group_id": "default",
              "action_subgroup": undefined,
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
          "message": "alert: test:1: 'alert-name' instanceId: '1' scheduled actionGroup: 'default' action: action:1",
          "rule": Object {
            "category": "test",
            "id": "1",
            "license": "basic",
            "name": "alert-name",
            "namespace": undefined,
            "ruleset": "alerts",
          },
        },
      ],
      Array [
        Object {
          "@timestamp": "1970-01-01T00:00:00.000Z",
          "event": Object {
            "action": "execute",
            "category": Array [
              "alerts",
            ],
            "kind": "alert",
            "outcome": "success",
          },
          "kibana": Object {
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
          },
          "message": "alert executed: test:1: 'alert-name'",
          "rule": Object {
            "category": "test",
            "id": "1",
            "license": "basic",
            "name": "alert-name",
            "namespace": undefined,
            "ruleset": "alerts",
          },
        },
      ],
    ]
  `);
  });

  test('fire recovered actions for execution for the alertInstances which is in the recovered state', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);

    alertType.executor.mockImplementation(
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
      alertType,
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
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
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

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledTimes(4);
    expect(logger.debug).nthCalledWith(1, 'executing alert test:1 at 1970-01-01T00:00:00.000Z');
    expect(logger.debug).nthCalledWith(
      2,
      `alert test:1: 'alert-name' has 1 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).nthCalledWith(
      3,
      `alert test:1: 'alert-name' has 1 recovered alert instances: [\"2\"]`
    );
    expect(logger.debug).nthCalledWith(
      4,
      'alertExecutionStatus for test:1: {"lastExecutionDate":"1970-01-01T00:00:00.000Z","status":"active"}'
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' instance '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
              "alerting": Object {
                "action_group_id": "recovered",
                "action_subgroup": undefined,
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
            "message": "alert: test:1: 'alert-name' instanceId: '2' scheduled actionGroup: 'recovered' action: action:2",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
              "alerting": Object {
                "action_group_id": "default",
                "action_subgroup": undefined,
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
            "message": "alert: test:1: 'alert-name' instanceId: '1' scheduled actionGroup: 'default' action: action:1",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);

    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(2);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "id": "2",
          "params": Object {
            "isResolved": true,
          },
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
  });

  test('should skip alertInstances which werent active on the previous execution', async () => {
    const alertId = 'e558aaad-fd81-46d2-96fc-3bd8fc3dc03f';
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);

    alertType.executor.mockImplementation(
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
      alertType,
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
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: alertId,
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
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

    const logger = taskRunnerFactoryInitializerParams.logger;
    expect(logger.debug).toHaveBeenCalledWith(
      `alert test:${alertId}: 'alert-name' has 1 active alert instances: [{\"instanceId\":\"1\",\"actionGroup\":\"default\"}]`
    );
    expect(logger.debug).toHaveBeenCalledWith(
      `alert test:${alertId}: 'alert-name' has 1 recovered alert instances: [\"2\"]`
    );

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(2);
    expect(actionsClient.enqueueExecution.mock.calls[1][0].id).toEqual('1');
    expect(actionsClient.enqueueExecution.mock.calls[0][0].id).toEqual('2');
  });

  test('fire actions under a custom recovery group when specified on an alert type for alertInstances which are in the recovered state', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);

    const recoveryActionGroup = {
      id: 'customRecovered',
      name: 'Custom Recovered',
    };
    const alertTypeWithCustomRecovery = {
      ...alertType,
      recoveryActionGroup,
      actionGroups: [{ id: 'default', name: 'Default' }, recoveryActionGroup],
    };

    alertTypeWithCustomRecovery.executor.mockImplementation(
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
      alertTypeWithCustomRecovery,
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
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
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

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(2);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "apiKey": "MTIzOmFiYw==",
          "id": "2",
          "params": Object {
            "isResolved": true,
          },
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
  });

  test('persists alertInstances passed in from state, only if they are scheduled for execution', async () => {
    alertType.executor.mockImplementation(
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
      alertType,
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
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
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
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' instance '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('validates params before executing the alert type', async () => {
    const taskRunner = new TaskRunner(
      {
        ...alertType,
        validate: {
          params: schema.object({
            param1: schema.string(),
          }),
        },
      },
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    expect(await taskRunner.run()).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);
    expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
      `Executing Alert \"1\" has resulted in Error: params invalid: [param1]: expected value of type [string] but got [undefined]`
    );
  });

  test('uses API key when provided', async () => {
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
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
  });

  test(`doesn't use API key when not provided`, async () => {
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {},
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
  });

  test('rescheduled the Alert if the schedule has update during a task run', async () => {
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    alertsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    alertsClient.get.mockResolvedValueOnce({
      ...mockedAlertTypeSavedObject,
      schedule: { interval: '30s' },
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    expect(await taskRunner.run()).toMatchInlineSnapshot(`
      Object {
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
  });

  test('recovers gracefully when the AlertType executor throws an exception', async () => {
    alertType.executor.mockImplementation(
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
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
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
            },
            "message": "alert execution failure: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching the encrypted attributes', async () => {
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
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
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when license is higher than supported', async () => {
    alertTypeRegistry.ensureAlertTypeEnabled.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
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
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when getting internal Services', async () => {
    taskRunnerFactoryInitializerParams.getServices.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
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
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching attributes', async () => {
    alertsClient.get.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "10s",
        },
        "state": Object {},
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
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
            },
            "message": "test:1: execution failed",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('recovers gracefully when the Runner of a legacy Alert task which has no schedule throws an exception when fetching attributes', async () => {
    alertsClient.get.mockImplementation(() => {
      throw new Error('OMG');
    });

    // legacy alerts used to run by returning a new `runAt` instead of using a schedule
    // ensure we return a fallback schedule when this happens, otherwise the task might be deleted
    const legacyTaskInstance = omit(mockedTaskInstance, 'schedule');

    const taskRunner = new TaskRunner(
      alertType,
      legacyTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "schedule": Object {
          "interval": "5m",
        },
        "state": Object {},
      }
    `);
  });

  test(`doesn't change previousStartedAt when it fails to run`, async () => {
    const originalAlertSate = {
      previousStartedAt: '1970-01-05T00:00:00.000Z',
    };

    alertType.executor.mockImplementation(
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
      alertType,
      {
        ...mockedTaskInstance,
        state: originalAlertSate,
      },
      taskRunnerFactoryInitializerParams
    );

    alertsClient.get.mockResolvedValue(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const runnerResult = await taskRunner.run();

    expect(runnerResult.state.previousStartedAt).toEqual(
      new Date(originalAlertSate.previousStartedAt)
    );
  });

  test('avoids rescheduling a failed Alert Task Runner when it throws due to failing to fetch the alert', async () => {
    alertsClient.get.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    const logger = taskRunnerFactoryInitializerParams.logger;
    return taskRunner.run().catch((ex) => {
      expect(ex).toMatchInlineSnapshot(`[Error: Saved object [alert/1] not found]`);
      expect(logger.debug).toHaveBeenCalledWith(
        `Executing Alert "1" has resulted in Error: Saved object [alert/1] not found`
      );
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).nthCalledWith(
        1,
        `Unable to execute rule "1" because Saved object [alert/1] not found - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
      );
      expect(isUnrecoverableError(ex)).toBeTruthy();
    });
  });

  test('correctly logs warning when Alert Task Runner throws due to failing to fetch the alert in a space', async () => {
    alertsClient.get.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('alert', '1');
    });

    const taskRunner = new TaskRunner(
      alertType,
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
      },
      references: [],
    });

    const logger = taskRunnerFactoryInitializerParams.logger;
    return taskRunner.run().catch((ex) => {
      expect(ex).toMatchInlineSnapshot(`[Error: Saved object [alert/1] not found]`);
      expect(logger.debug).toHaveBeenCalledWith(
        `Executing Alert "1" has resulted in Error: Saved object [alert/1] not found`
      );
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).nthCalledWith(
        1,
        `Unable to execute rule "1" in the "test space" space because Saved object [alert/1] not found - this rule will not be rescheduled. To restart rule execution, try disabling and re-enabling this rule.`
      );
    });
  });

  test('start time is logged for new alerts', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
      {
        ...mockedTaskInstance,
        state: {
          ...mockedTaskInstance.state,
          alertInstances: {},
        },
      },
      taskRunnerFactoryInitializerParams
    );
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(5);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' created new instance: '1'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' created new instance: '2'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' active instance: '2' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('duration is updated for active alerts when alert state contains start time', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
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
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' active instance: '2' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('duration is not calculated for active alerts when alert state does not contain start time', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
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
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' active instance: '1' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' active instance: '2' in actionGroup: 'default'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('end is logged for active alerts when alert state contains start time and alert recovers', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(async () => {});
    const taskRunner = new TaskRunner(
      alertType,
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
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' instance '1' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' instance '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });

  test('end calculation is skipped for active alerts when alert state does not contain start time and alert recovers', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
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
      alertType,
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
    alertsClient.get.mockResolvedValue({
      ...mockedAlertTypeSavedObject,
      notifyWhen: 'onActionGroupChange',
      actions: [],
    });
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });
    await taskRunner.run();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
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
            "message": "test:1: 'alert-name' instance '1' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
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
            "message": "test:1: 'alert-name' instance '2' has recovered",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
        Array [
          Object {
            "@timestamp": "1970-01-01T00:00:00.000Z",
            "event": Object {
              "action": "execute",
              "category": Array [
                "alerts",
              ],
              "kind": "alert",
              "outcome": "success",
            },
            "kibana": Object {
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
            },
            "message": "alert executed: test:1: 'alert-name'",
            "rule": Object {
              "category": "test",
              "id": "1",
              "license": "basic",
              "name": "alert-name",
              "namespace": undefined,
              "ruleset": "alerts",
            },
          },
        ],
      ]
    `);
  });
});

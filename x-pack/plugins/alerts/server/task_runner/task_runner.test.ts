/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { schema } from '@kbn/config-schema';
import { AlertExecutorOptions } from '../types';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager/server';
import { TaskRunnerContext } from './task_runner_factory';
import { TaskRunner } from './task_runner';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { PluginStartContract as ActionsPluginStart } from '../../../actions/server';
import { actionsMock, actionsClientMock } from '../../../actions/server/mocks';
import { alertsMock } from '../mocks';
import { eventLoggerMock } from '../../../event_log/server/event_logger.mock';
import { IEventLogger } from '../../../event_log/server';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

const alertType = {
  id: 'test',
  name: 'My test alert',
  actionGroups: [{ id: 'default', name: 'Default' }],
  defaultActionGroupId: 'default',
  executor: jest.fn(),
  producer: 'alerting',
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
  const savedObjectsClient = services.savedObjectsClient;
  const actionsClient = actionsClientMock.create();

  const taskRunnerFactoryInitializerParams: jest.Mocked<TaskRunnerContext> & {
    actionsPlugin: jest.Mocked<ActionsPluginStart>;
    eventLogger: jest.Mocked<IEventLogger>;
  } = {
    getServices: jest.fn().mockReturnValue(services),
    actionsPlugin: actionsMock.createStart(),
    encryptedSavedObjectsClient,
    logger: loggingSystemMock.create().get(),
    spaceIdToNamespace: jest.fn().mockReturnValue(undefined),
    getBasePath: jest.fn().mockReturnValue(undefined),
    eventLogger: eventLoggerMock.create(),
  };

  const mockedAlertTypeSavedObject = {
    id: '1',
    type: 'alert',
    attributes: {
      enabled: true,
      alertTypeId: '123',
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
          actionRef: 'action_0',
          params: {
            foo: true,
          },
        },
      ],
    },
    references: [
      {
        name: 'action_0',
        type: 'action',
        id: '1',
      },
    ],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    taskRunnerFactoryInitializerParams.getServices.mockReturnValue(services);
    taskRunnerFactoryInitializerParams.actionsPlugin.getActionsClientWithRequest.mockResolvedValue(
      actionsClient
    );
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
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
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
                                    "runAt": 1970-01-01T00:00:10.000Z,
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
    expect(call.services.alertInstanceFactory).toBeTruthy();
    expect(call.services.callCluster).toBeTruthy();
    expect(call.services).toBeTruthy();

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "event": Object {
          "action": "execute",
          "outcome": "success",
        },
        "kibana": Object {
          "saved_objects": Array [
            Object {
              "id": "1",
              "namespace": undefined,
              "rel": "primary",
              "type": "alert",
            },
          ],
        },
        "message": "alert executed: test:1: 'alert-name'",
      }
    `);
  });

  test('actionsPlugin.execute is called per alert instance that is scheduled', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
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
                      "spaceId": undefined,
                    },
                  ]
          `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent).toHaveBeenCalledWith({
      event: {
        action: 'execute',
        outcome: 'success',
      },
      kibana: {
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
          },
        ],
      },
      message: "alert executed: test:1: 'alert-name'",
    });
    expect(eventLogger.logEvent).toHaveBeenCalledWith({
      event: {
        action: 'new-instance',
      },
      kibana: {
        alerting: {
          instance_id: '1',
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
          },
        ],
      },
      message: "test:1: 'alert-name' created new instance: '1'",
    });
    expect(eventLogger.logEvent).toHaveBeenCalledWith({
      event: {
        action: 'execute-action',
      },
      kibana: {
        alerting: {
          instance_id: '1',
        },
        saved_objects: [
          {
            id: '1',
            namespace: undefined,
            rel: 'primary',
            type: 'alert',
          },
          {
            id: '1',
            namespace: undefined,
            type: 'action',
          },
        ],
      },
      message:
        "alert: test:1: 'alert-name' instanceId: '1' scheduled actionGroup: 'default' action: undefined:1",
    });
  });

  test('includes the apiKey in the request used to initialize the actionsClient', async () => {
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionTypeEnabled.mockReturnValue(true);
    taskRunnerFactoryInitializerParams.actionsPlugin.isActionExecutable.mockReturnValue(true);
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
        executorServices.alertInstanceFactory('1').scheduleActions('default');
      }
    );
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
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
    ).toHaveBeenCalledWith({
      getBasePath: expect.anything(),
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    });
    expect(actionsClient.enqueueExecution).toHaveBeenCalledTimes(1);
    expect(actionsClient.enqueueExecution.mock.calls[0]).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "apiKey": "MTIzOmFiYw==",
                      "id": "1",
                      "params": Object {
                        "foo": true,
                      },
                      "spaceId": undefined,
                    },
                  ]
          `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(3);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "outcome": "success",
            },
            "kibana": Object {
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                },
              ],
            },
            "message": "alert executed: test:1: 'alert-name'",
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "new-instance",
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
                },
              ],
            },
            "message": "test:1: 'alert-name' created new instance: '1'",
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "execute-action",
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
                },
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "type": "action",
                },
              ],
            },
            "message": "alert: test:1: 'alert-name' instanceId: '1' scheduled actionGroup: 'default' action: undefined:1",
          },
        ],
      ]
    `);
  });

  test('persists alertInstances passed in from state, only if they are scheduled for execution', async () => {
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
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
            '1': { meta: {}, state: { bar: false } },
            '2': { meta: {}, state: { bar: false } },
          },
        },
      },
      taskRunnerFactoryInitializerParams
    );
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
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
            },
          },
          "state": Object {
            "bar": false,
          },
        },
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(2);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "event": Object {
              "action": "execute",
              "outcome": "success",
            },
            "kibana": Object {
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                },
              ],
            },
            "message": "alert executed: test:1: 'alert-name'",
          },
        ],
        Array [
          Object {
            "event": Object {
              "action": "resolved-instance",
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
                },
              ],
            },
            "message": "test:1: 'alert-name' resolved instance: '2'",
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
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
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
        "runAt": 1970-01-01T00:00:10.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);
    expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
      `Executing Alert \"1\" has resulted in Error: params invalid: [param1]: expected value of type [string] but got [undefined]`
    );
  });

  test('throws error if reference not found', async () => {
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    savedObjectsClient.get.mockResolvedValueOnce({
      ...mockedAlertTypeSavedObject,
      references: [],
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
        "runAt": 1970-01-01T00:00:10.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);
    expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
      `Executing Alert \"1\" has resulted in Error: Action reference \"action_0\" not found in alert id: 1`
    );
  });

  test('uses API key when provided', async () => {
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      references: [],
    });

    await taskRunner.run();
    expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith({
      getBasePath: expect.anything(),
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    });
  });

  test(`doesn't use API key when not provided`, async () => {
    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );
    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
      id: '1',
      type: 'alert',
      attributes: {},
      references: [],
    });

    await taskRunner.run();

    expect(taskRunnerFactoryInitializerParams.getServices).toHaveBeenCalledWith({
      getBasePath: expect.anything(),
      headers: {},
      path: '/',
      route: { settings: {} },
      url: {
        href: '/',
      },
      raw: {
        req: {
          url: '/',
        },
      },
    });
  });

  test('recovers gracefully when the AlertType executor throws an exception', async () => {
    alertType.executor.mockImplementation(
      ({ services: executorServices }: AlertExecutorOptions) => {
        throw new Error('OMG');
      }
    );

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
      taskRunnerFactoryInitializerParams
    );

    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
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
        "runAt": 1970-01-01T00:00:10.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);

    const eventLogger = taskRunnerFactoryInitializerParams.eventLogger;
    expect(eventLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(eventLogger.logEvent.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "error": Object {
              "message": "OMG",
            },
            "event": Object {
              "action": "execute",
              "outcome": "failure",
            },
            "kibana": Object {
              "saved_objects": Array [
                Object {
                  "id": "1",
                  "namespace": undefined,
                  "rel": "primary",
                  "type": "alert",
                },
              ],
            },
            "message": "alert execution failure: test:1: 'alert-name'",
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

    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);

    const runnerResult = await taskRunner.run();

    expect(runnerResult).toMatchInlineSnapshot(`
      Object {
        "runAt": 1970-01-01T00:05:00.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
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

    savedObjectsClient.get.mockResolvedValueOnce(mockedAlertTypeSavedObject);
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
        "runAt": 1970-01-01T00:05:00.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);
  });

  test('recovers gracefully when the Alert Task Runner throws an exception when fetching attributes', async () => {
    savedObjectsClient.get.mockImplementation(() => {
      throw new Error('OMG');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
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
        "runAt": 1970-01-01T00:05:00.000Z,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);
  });

  test('avoids rescheduling a failed Alert Task Runner when it throws due to failing to fetch the alert', async () => {
    savedObjectsClient.get.mockImplementation(() => {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError('task', '1');
    });

    const taskRunner = new TaskRunner(
      alertType,
      mockedTaskInstance,
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
        "runAt": undefined,
        "state": Object {
          "previousStartedAt": 1970-01-01T00:00:00.000Z,
        },
      }
    `);
  });
});

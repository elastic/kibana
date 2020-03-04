/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { ExecutorError } from './executor_error';
import { ActionExecutor } from './action_executor';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager/server';
import { TaskRunnerFactory } from './task_runner_factory';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { actionExecutorMock } from './action_executor.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { savedObjectsClientMock, loggingServiceMock } from 'src/core/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/mocks';

const spaceIdToNamespace = jest.fn();
const actionTypeRegistry = actionTypeRegistryMock.create();
const mockedEncryptedSavedObjectsPlugin = encryptedSavedObjectsMock.createStart();
const mockedActionExecutor = actionExecutorMock.create();

let fakeTimer: sinon.SinonFakeTimers;
let taskRunnerFactory: TaskRunnerFactory;
let mockedTaskInstance: ConcreteTaskInstance;

beforeAll(() => {
  fakeTimer = sinon.useFakeTimers();
  mockedTaskInstance = {
    id: '',
    runAt: new Date(),
    state: {},
    attempts: 0,
    ownerId: '',
    status: TaskStatus.Running,
    startedAt: new Date(),
    scheduledAt: new Date(),
    retryAt: new Date(Date.now() + 5 * 60 * 1000),
    params: {
      spaceId: 'test',
      actionTaskParamsId: '3',
    },
    taskType: 'actions:1',
  };
  taskRunnerFactory = new TaskRunnerFactory(mockedActionExecutor);
  mockedActionExecutor.initialize(actionExecutorInitializerParams);
  taskRunnerFactory.initialize(taskRunnerFactoryInitializerParams);
});

afterAll(() => fakeTimer.restore());

const services = {
  log: jest.fn(),
  callCluster: jest.fn(),
  savedObjectsClient: savedObjectsClientMock.create(),
};
const actionExecutorInitializerParams = {
  logger: loggingServiceMock.create().get(),
  getServices: jest.fn().mockReturnValue(services),
  actionTypeRegistry,
  encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
  eventLogger: eventLoggerMock.create(),
};
const taskRunnerFactoryInitializerParams = {
  spaceIdToNamespace,
  logger: loggingServiceMock.create().get(),
  encryptedSavedObjectsPlugin: mockedEncryptedSavedObjectsPlugin,
  getBasePath: jest.fn().mockReturnValue(undefined),
  getScopedSavedObjectsClient: jest.fn().mockReturnValue(services.savedObjectsClient),
};

beforeEach(() => {
  jest.resetAllMocks();
  actionExecutorInitializerParams.getServices.mockReturnValue(services);
  taskRunnerFactoryInitializerParams.getScopedSavedObjectsClient.mockReturnValue(
    services.savedObjectsClient
  );
});

test(`throws an error if factory isn't initialized`, () => {
  const factory = new TaskRunnerFactory(
    new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false })
  );
  expect(() =>
    factory.create({ taskInstance: mockedTaskInstance })
  ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
});

test(`throws an error if factory is already initialized`, () => {
  const factory = new TaskRunnerFactory(
    new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false })
  );
  factory.initialize(taskRunnerFactoryInitializerParams);
  expect(() =>
    factory.initialize(taskRunnerFactoryInitializerParams)
  ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory already initialized"`);
});

test('executes the task by calling the executor with proper parameters', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });

  const runnerResult = await taskRunner.run();

  expect(runnerResult).toBeUndefined();
  expect(spaceIdToNamespace).toHaveBeenCalledWith('test');
  expect(
    mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser
  ).toHaveBeenCalledWith('action_task_params', '3', { namespace: 'namespace-test' });
  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    params: { baz: true },
    request: {
      getBasePath: expect.any(Function),
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
    },
  });
});

test('cleans up action_task_params object', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });

  await taskRunner.run();

  expect(services.savedObjectsClient.delete).toHaveBeenCalledWith('action_task_params', '3');
});

test('runs successfully when cleanup fails and logs the error', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  services.savedObjectsClient.delete.mockRejectedValueOnce(new Error('Fail'));

  await taskRunner.run();

  expect(services.savedObjectsClient.delete).toHaveBeenCalledWith('action_task_params', '3');
  expect(taskRunnerFactoryInitializerParams.logger.error).toHaveBeenCalledWith(
    'Failed to cleanup action_task_params object [id="3"]: Fail'
  );
});

test('throws an error with suggested retry logic when return status is error', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });
  mockedActionExecutor.execute.mockResolvedValueOnce({
    status: 'error',
    actionId: '2',
    message: 'Error message',
    data: { foo: true },
    retry: false,
  });

  try {
    await taskRunner.run();
    throw new Error('Should have thrown');
  } catch (e) {
    expect(e instanceof ExecutorError).toEqual(true);
    expect(e.data).toEqual({ foo: true });
    expect(e.retry).toEqual(false);
  }
});

test('uses API key when provided', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [],
  });

  await taskRunner.run();

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    params: { baz: true },
    request: {
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
    },
  });
});

test(`doesn't use API key when not provided`, async () => {
  const factory = new TaskRunnerFactory(mockedActionExecutor);
  factory.initialize(taskRunnerFactoryInitializerParams);
  const taskRunner = factory.create({ taskInstance: mockedTaskInstance });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsPlugin.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
    },
    references: [],
  });

  await taskRunner.run();

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    params: { baz: true },
    request: {
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
    },
  });
});

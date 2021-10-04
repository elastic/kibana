/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { ExecutorError } from './executor_error';
import { ActionExecutor } from './action_executor';
import { ConcreteTaskInstance, TaskStatus } from '../../../task_manager/server';
import { TaskRunnerFactory } from './task_runner_factory';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { actionExecutorMock } from './action_executor.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { savedObjectsClientMock, loggingSystemMock, httpServiceMock } from 'src/core/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/mocks';
import { ActionTypeDisabledError } from './errors';
import { actionsClientMock } from '../mocks';

const spaceIdToNamespace = jest.fn();
const actionTypeRegistry = actionTypeRegistryMock.create();
const mockedEncryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
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
  savedObjectsClient: savedObjectsClientMock.create(),
};
const actionExecutorInitializerParams = {
  logger: loggingSystemMock.create().get(),
  getServices: jest.fn().mockReturnValue(services),
  actionTypeRegistry,
  getActionsClientWithRequest: jest.fn(async () => actionsClientMock.create()),
  encryptedSavedObjectsClient: mockedEncryptedSavedObjectsClient,
  eventLogger: eventLoggerMock.create(),
  preconfiguredActions: [],
};
const taskRunnerFactoryInitializerParams = {
  spaceIdToNamespace,
  actionTypeRegistry,
  logger: loggingSystemMock.create().get(),
  encryptedSavedObjectsClient: mockedEncryptedSavedObjectsClient,
  basePathService: httpServiceMock.createBasePath(),
  getUnsecuredSavedObjectsClient: jest.fn().mockReturnValue(services.savedObjectsClient),
};

beforeEach(() => {
  jest.resetAllMocks();
  actionExecutorInitializerParams.getServices.mockReturnValue(services);
  taskRunnerFactoryInitializerParams.getUnsecuredSavedObjectsClient.mockReturnValue(
    services.savedObjectsClient
  );
});

test(`throws an error if factory isn't initialized`, () => {
  const factory = new TaskRunnerFactory(new ActionExecutor({ isESOCanEncrypt: true }));
  expect(() =>
    factory.create({ taskInstance: mockedTaskInstance })
  ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory not initialized"`);
});

test(`throws an error if factory is already initialized`, () => {
  const factory = new TaskRunnerFactory(new ActionExecutor({ isESOCanEncrypt: true }));
  factory.initialize(taskRunnerFactoryInitializerParams);
  expect(() =>
    factory.initialize(taskRunnerFactoryInitializerParams)
  ).toThrowErrorMatchingInlineSnapshot(`"TaskRunnerFactory already initialized"`);
});

test('executes the task by calling the executor with proper parameters, using given actionId when no actionRef in references', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
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
  expect(mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action_task_params',
    '3',
    { namespace: 'namespace-test' }
  );

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    isEphemeral: false,
    params: { baz: true },
    relatedSavedObjects: [],
    request: expect.objectContaining({
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
    }),
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });

  const [executeParams] = mockedActionExecutor.execute.mock.calls[0];
  expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
    executeParams.request,
    '/s/test'
  );
});

test('executes the task by calling the executor with proper parameters, using stored actionId when actionRef is in references', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '9',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });

  const runnerResult = await taskRunner.run();

  expect(runnerResult).toBeUndefined();
  expect(spaceIdToNamespace).toHaveBeenCalledWith('test');
  expect(mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action_task_params',
    '3',
    { namespace: 'namespace-test' }
  );

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '9',
    isEphemeral: false,
    params: { baz: true },
    relatedSavedObjects: [],
    request: expect.objectContaining({
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
    }),
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });

  const [executeParams] = mockedActionExecutor.execute.mock.calls[0];
  expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
    executeParams.request,
    '/s/test'
  );
});

test('cleans up action_task_params object', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
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
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
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

  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
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
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });

  await taskRunner.run();

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    isEphemeral: false,
    params: { baz: true },
    relatedSavedObjects: [],
    request: expect.objectContaining({
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
    }),
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });

  const [executeParams] = mockedActionExecutor.execute.mock.calls[0];
  expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
    executeParams.request,
    '/s/test'
  );
});

test('uses relatedSavedObjects merged with references when provided', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
      relatedSavedObjects: [{ id: 'related_some-type_0', type: 'some-type' }],
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
      {
        id: 'some-id',
        name: 'related_some-type_0',
        type: 'some-type',
      },
    ],
  });

  await taskRunner.run();

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    isEphemeral: false,
    params: { baz: true },
    relatedSavedObjects: [
      {
        id: 'some-id',
        type: 'some-type',
      },
    ],
    request: expect.objectContaining({
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
    }),
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });
});

test('uses relatedSavedObjects as is when references are empty', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
      relatedSavedObjects: [{ id: 'abc', type: 'some-type', namespace: 'yo' }],
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });

  await taskRunner.run();

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    isEphemeral: false,
    params: { baz: true },
    relatedSavedObjects: [
      {
        id: 'abc',
        type: 'some-type',
        namespace: 'yo',
      },
    ],
    request: expect.objectContaining({
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
    }),
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });
});

test('sanitizes invalid relatedSavedObjects when provided', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: mockedTaskInstance,
  });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
      relatedSavedObjects: [{ Xid: 'related_some-type_0', type: 'some-type' }],
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
      {
        id: 'some-id',
        name: 'related_some-type_0',
        type: 'some-type',
      },
    ],
  });

  await taskRunner.run();
  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    isEphemeral: false,
    params: { baz: true },
    request: expect.objectContaining({
      headers: {
        // base64 encoded "123:abc"
        authorization: 'ApiKey MTIzOmFiYw==',
      },
    }),
    relatedSavedObjects: [],
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });
});

test(`doesn't use API key when not provided`, async () => {
  const factory = new TaskRunnerFactory(mockedActionExecutor);
  factory.initialize(taskRunnerFactoryInitializerParams);
  const taskRunner = factory.create({ taskInstance: mockedTaskInstance });

  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '2' });
  spaceIdToNamespace.mockReturnValueOnce('namespace-test');
  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });

  await taskRunner.run();

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '2',
    isEphemeral: false,
    params: { baz: true },
    relatedSavedObjects: [],
    request: expect.objectContaining({
      headers: {},
    }),
    taskInfo: {
      scheduled: new Date(),
      attempts: 0,
    },
  });

  const [executeParams] = mockedActionExecutor.execute.mock.calls[0];
  expect(taskRunnerFactoryInitializerParams.basePathService.set).toHaveBeenCalledWith(
    executeParams.request,
    '/s/test'
  );
});

test(`throws an error when license doesn't support the action type`, async () => {
  const taskRunner = taskRunnerFactory.create(
    {
      taskInstance: {
        ...mockedTaskInstance,
        attempts: 1,
      },
    },
    2
  );

  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });
  mockedActionExecutor.execute.mockImplementation(() => {
    throw new ActionTypeDisabledError('Fail', 'license_invalid');
  });

  try {
    await taskRunner.run();
    throw new Error('Should have thrown');
  } catch (e) {
    expect(e instanceof ExecutorError).toEqual(true);
    expect(e.data).toEqual({});
    expect(e.retry).toEqual(true);
  }
});

test(`treats errors as errors if the task is retryable`, async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: {
      ...mockedTaskInstance,
      attempts: 0,
    },
  });

  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });
  mockedActionExecutor.execute.mockResolvedValueOnce({
    status: 'error',
    actionId: '2',
    message: 'Error message',
    data: { foo: true },
    retry: false,
  });

  let err;
  try {
    await taskRunner.run();
  } catch (e) {
    err = e;
  }
  expect(err).toBeDefined();
  expect(err instanceof ExecutorError).toEqual(true);
  expect(err.data).toEqual({ foo: true });
  expect(err.retry).toEqual(false);
  expect(taskRunnerFactoryInitializerParams.logger.error as jest.Mock).toHaveBeenCalledWith(
    `Action '2' failed and will not retry: Error message`
  );
});

test(`treats errors as successes if the task is not retryable`, async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: {
      ...mockedTaskInstance,
      attempts: 1,
    },
  });

  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });
  mockedActionExecutor.execute.mockResolvedValueOnce({
    status: 'error',
    actionId: '2',
    message: 'Error message',
    data: { foo: true },
    retry: false,
  });

  let err;
  try {
    await taskRunner.run();
  } catch (e) {
    err = e;
  }
  expect(err).toBeUndefined();
  expect(taskRunnerFactoryInitializerParams.logger.error as jest.Mock).toHaveBeenCalledWith(
    `Action '2' failed and will not retry: Error message`
  );
});

test('treats errors as errors if the error is thrown instead of returned', async () => {
  const taskRunner = taskRunnerFactory.create({
    taskInstance: {
      ...mockedTaskInstance,
      attempts: 0,
    },
  });

  mockedEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce({
    id: '3',
    type: 'action_task_params',
    attributes: {
      actionId: '2',
      params: { baz: true },
      apiKey: Buffer.from('123:abc').toString('base64'),
    },
    references: [
      {
        id: '2',
        name: 'actionRef',
        type: 'action',
      },
    ],
  });
  mockedActionExecutor.execute.mockRejectedValueOnce({});

  let err;
  try {
    await taskRunner.run();
  } catch (e) {
    err = e;
  }
  expect(err).toBeDefined();
  expect(err instanceof ExecutorError).toEqual(true);
  expect(err.data).toEqual({});
  expect(err.retry).toEqual(true);
  expect(taskRunnerFactoryInitializerParams.logger.error as jest.Mock).toHaveBeenCalledWith(
    `Action '2' failed and will retry: undefined`
  );
});

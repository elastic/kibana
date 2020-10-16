/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from '../../../../../src/core/server';
import { schema } from '@kbn/config-schema';
import { ActionExecutor } from './action_executor';
import { actionTypeRegistryMock } from '../action_type_registry.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { loggingSystemMock } from '../../../../../src/core/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/mocks';
import { spacesServiceMock } from '../../../spaces/server/spaces_service/spaces_service.mock';
import { ActionType } from '../types';
import { actionsMock, actionsClientMock } from '../mocks';
import { pick } from 'lodash';

const actionExecutor = new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false });
const services = actionsMock.createServices();

const actionsClient = actionsClientMock.create();
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const actionTypeRegistry = actionTypeRegistryMock.create();

const executeParams = {
  actionId: '1',
  params: {
    foo: true,
  },
  request: {} as KibanaRequest,
};

const spacesMock = spacesServiceMock.createSetupContract();
const loggerMock = loggingSystemMock.create().get();
const getActionsClientWithRequest = jest.fn();
actionExecutor.initialize({
  logger: loggerMock,
  spaces: spacesMock,
  getServices: () => services,
  getActionsClientWithRequest,
  actionTypeRegistry,
  encryptedSavedObjectsClient,
  eventLogger: eventLoggerMock.create(),
  preconfiguredActions: [],
});

beforeEach(() => {
  jest.resetAllMocks();
  spacesMock.getSpaceId.mockReturnValue('some-namespace');
  getActionsClientWithRequest.mockResolvedValue(actionsClient);
});

test('successfully executes', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.id,
    ...pick(actionSavedObject.attributes, 'actionTypeId', 'config'),
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute(executeParams);

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action',
    '1',
    { namespace: 'some-namespace' }
  );

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');
  expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('1', 'test', {
    notifyUsage: true,
  });

  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
  });
});

test('provides empty config when config and / or secrets is empty', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.id,
    actionTypeId: actionSavedObject.attributes.actionTypeId,
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute(executeParams);

  expect(actionType.executor).toHaveBeenCalledTimes(1);
  const executorCall = actionType.executor.mock.calls[0][0];
  expect(executorCall.config).toMatchInlineSnapshot(`undefined`);
});

test('throws an error when config is invalid', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    validate: {
      config: schema.object({
        param1: schema.string(),
      }),
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.id,
    actionTypeId: actionSavedObject.attributes.actionTypeId,
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await actionExecutor.execute(executeParams);
  expect(result).toEqual({
    actionId: '1',
    status: 'error',
    retry: false,
    message: `error validating action type config: [param1]: expected value of type [string] but got [undefined]`,
  });
});

test('throws an error when params is invalid', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    validate: {
      params: schema.object({
        param1: schema.string(),
      }),
    },
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.id,
    actionTypeId: actionSavedObject.attributes.actionTypeId,
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);

  const result = await actionExecutor.execute(executeParams);
  expect(result).toEqual({
    actionId: '1',
    status: 'error',
    retry: false,
    message: `error validating action params: [param1]: expected value of type [string] but got [undefined]`,
  });
});

test('throws an error when failing to load action through savedObjectsClient', async () => {
  actionsClient.get.mockRejectedValueOnce(new Error('No access'));
  await expect(actionExecutor.execute(executeParams)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"No access"`
  );
});

test('throws an error if actionType is not enabled', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.id,
    actionTypeId: actionSavedObject.attributes.actionTypeId,
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
    throw new Error('not enabled for test');
  });
  await expect(actionExecutor.execute(executeParams)).rejects.toThrowErrorMatchingInlineSnapshot(
    `"not enabled for test"`
  );

  expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledWith('test');
});

test('should not throws an error if actionType is preconfigured', async () => {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    attributes: {
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.id,
    ...pick(actionSavedObject.attributes, 'actionTypeId', 'config', 'secrets'),
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  actionTypeRegistry.ensureActionTypeEnabled.mockImplementationOnce(() => {
    throw new Error('not enabled for test');
  });
  actionTypeRegistry.isActionExecutable.mockImplementationOnce(() => true);
  await actionExecutor.execute(executeParams);

  expect(actionTypeRegistry.ensureActionTypeEnabled).toHaveBeenCalledTimes(0);
  expect(actionType.executor).toHaveBeenCalledWith({
    actionId: '1',
    services: expect.anything(),
    config: {
      bar: true,
    },
    secrets: {
      baz: true,
    },
    params: { foo: true },
  });
});

test('throws an error when passing isESOUsingEphemeralEncryptionKey with value of true', async () => {
  const customActionExecutor = new ActionExecutor({ isESOUsingEphemeralEncryptionKey: true });
  customActionExecutor.initialize({
    logger: loggingSystemMock.create().get(),
    spaces: spacesMock,
    getActionsClientWithRequest,
    getServices: () => services,
    actionTypeRegistry,
    encryptedSavedObjectsClient,
    eventLogger: eventLoggerMock.create(),
    preconfiguredActions: [],
  });
  await expect(
    customActionExecutor.execute(executeParams)
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Unable to execute action due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
  );
});

test('does not log warning when alert executor succeeds', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'ok',
  });
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).not.toBeCalled();
});

test('logs a warning when alert executor has an error', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockResolvedValue({
    actionId: '1',
    status: 'error',
    message: 'message for action execution error',
    serviceMessage: 'serviceMessage for action execution error',
  });
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).toBeCalledWith(
    'action execution failure: test:1: action-1: message for action execution error: serviceMessage for action execution error'
  );
});

test('logs a warning when alert executor throws an error', async () => {
  const executorMock = setupActionExecutorMock();
  executorMock.mockRejectedValue(new Error('this action execution is intended to fail'));
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).toBeCalledWith(
    'action execution failure: test:1: action-1: an error occurred while running the action executor: this action execution is intended to fail'
  );
});

test('logs a warning when alert executor returns invalid status', async () => {
  const executorMock = setupActionExecutorMock();
  // object typed as any as it has an invalid status value, but we want to test that
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertExecutionStatus: any = {
    actionId: '1',
    status: 'invalid-status',
    message: 'message for action execution error',
    serviceMessage: 'serviceMessage for action execution error',
  };
  executorMock.mockResolvedValue(alertExecutionStatus);
  await actionExecutor.execute(executeParams);
  expect(loggerMock.warn).toBeCalledWith(
    'action execution failure: test:1: action-1: returned unexpected result "invalid-status"'
  );
});

function setupActionExecutorMock() {
  const actionType: jest.Mocked<ActionType> = {
    id: 'test',
    name: 'Test',
    minimumLicenseRequired: 'basic',
    executor: jest.fn(),
  };
  const actionSavedObject = {
    id: '1',
    type: 'action',
    name: 'action-1',
    attributes: {
      actionTypeId: 'test',
      config: {
        bar: true,
      },
      secrets: {
        baz: true,
      },
    },
    references: [],
  };
  const actionResult = {
    id: actionSavedObject.id,
    name: actionSavedObject.name,
    ...pick(actionSavedObject.attributes, 'actionTypeId', 'config'),
    isPreconfigured: false,
  };
  actionsClient.get.mockResolvedValueOnce(actionResult);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  return actionType.executor;
}

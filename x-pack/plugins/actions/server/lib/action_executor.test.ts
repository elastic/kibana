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
import { loggingSystemMock, savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { eventLoggerMock } from '../../../event_log/server/mocks';
import { spacesServiceMock } from '../../../spaces/server/spaces_service/spaces_service.mock';
import { ActionType } from '../types';
import { actionsMock } from '../mocks';

const actionExecutor = new ActionExecutor({ isESOUsingEphemeralEncryptionKey: false });
const services = actionsMock.createServices();
const savedObjectsClientWithHidden = savedObjectsClientMock.create();
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
actionExecutor.initialize({
  logger: loggingSystemMock.create().get(),
  spaces: spacesMock,
  getServices: () => services,
  getScopedSavedObjectsClient: () => savedObjectsClientWithHidden,
  actionTypeRegistry,
  encryptedSavedObjectsClient,
  eventLogger: eventLoggerMock.create(),
  preconfiguredActions: [],
});

beforeEach(() => {
  jest.resetAllMocks();
  spacesMock.getSpaceId.mockReturnValue('some-namespace');
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
  savedObjectsClientWithHidden.get.mockResolvedValueOnce(actionSavedObject);
  encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(actionSavedObject);
  actionTypeRegistry.get.mockReturnValueOnce(actionType);
  await actionExecutor.execute(executeParams);

  expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
    'action',
    '1',
    { namespace: 'some-namespace' }
  );

  expect(actionTypeRegistry.get).toHaveBeenCalledWith('test');

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
  savedObjectsClientWithHidden.get.mockResolvedValueOnce(actionSavedObject);
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
  savedObjectsClientWithHidden.get.mockResolvedValueOnce(actionSavedObject);
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
  savedObjectsClientWithHidden.get.mockResolvedValueOnce(actionSavedObject);
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
  savedObjectsClientWithHidden.get.mockRejectedValueOnce(new Error('No access'));
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
  savedObjectsClientWithHidden.get.mockResolvedValueOnce(actionSavedObject);
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
  savedObjectsClientWithHidden.get.mockResolvedValueOnce(actionSavedObject);
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
    getScopedSavedObjectsClient: () => savedObjectsClientWithHidden,
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

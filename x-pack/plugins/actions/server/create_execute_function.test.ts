/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerMock } from '../../task_manager/server/task_manager.mock';
import { createExecuteFunction } from './create_execute_function';
import { savedObjectsClientMock } from '../../../../src/core/server/mocks';
import { actionTypeRegistryMock } from './action_type_registry.mock';

const mockTaskManager = taskManagerMock.start();
const savedObjectsClient = savedObjectsClientMock.create();
const getBasePath = jest.fn();

beforeEach(() => jest.resetAllMocks());

describe('execute()', () => {
  test('schedules the action with all given parameters', async () => {
    const executeFn = createExecuteFunction({
      getBasePath,
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      getScopedSavedObjectsClient: jest.fn().mockReturnValueOnce(savedObjectsClient),
      isESOUsingEphemeralEncryptionKey: false,
      preconfiguredActions: [],
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '234',
      type: 'action_task_params',
      attributes: {},
      references: [],
    });
    await executeFn({
      id: '123',
      params: { baz: false },
      spaceId: 'default',
      apiKey: Buffer.from('123:abc').toString('base64'),
    });
    expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.schedule.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "params": Object {
                  "actionTaskParamsId": "234",
                  "spaceId": "default",
                },
                "scope": Array [
                  "actions",
                ],
                "state": Object {},
                "taskType": "actions:mock-action",
              },
            ]
        `);
    expect(savedObjectsClient.get).toHaveBeenCalledWith('action', '123');
    expect(savedObjectsClient.create).toHaveBeenCalledWith('action_task_params', {
      actionId: '123',
      params: { baz: false },
      apiKey: Buffer.from('123:abc').toString('base64'),
    });
  });

  test('schedules the action with all given parameters with a preconfigured action', async () => {
    const executeFn = createExecuteFunction({
      getBasePath,
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      getScopedSavedObjectsClient: jest.fn().mockReturnValueOnce(savedObjectsClient),
      isESOUsingEphemeralEncryptionKey: false,
      preconfiguredActions: [
        {
          id: '123',
          actionTypeId: 'mock-action-preconfigured',
          config: {},
          isPreconfigured: true,
          name: 'x',
          secrets: {},
        },
      ],
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '234',
      type: 'action_task_params',
      attributes: {},
      references: [],
    });
    await executeFn({
      id: '123',
      params: { baz: false },
      spaceId: 'default',
      apiKey: Buffer.from('123:abc').toString('base64'),
    });
    expect(mockTaskManager.schedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.schedule.mock.calls[0]).toMatchInlineSnapshot(`
            Array [
              Object {
                "params": Object {
                  "actionTaskParamsId": "234",
                  "spaceId": "default",
                },
                "scope": Array [
                  "actions",
                ],
                "state": Object {},
                "taskType": "actions:mock-action-preconfigured",
              },
            ]
        `);
    expect(savedObjectsClient.get).not.toHaveBeenCalled();
    expect(savedObjectsClient.create).toHaveBeenCalledWith('action_task_params', {
      actionId: '123',
      params: { baz: false },
      apiKey: Buffer.from('123:abc').toString('base64'),
    });
  });

  test('uses API key when provided', async () => {
    const getScopedSavedObjectsClient = jest.fn().mockReturnValueOnce(savedObjectsClient);
    const executeFn = createExecuteFunction({
      getBasePath,
      taskManager: mockTaskManager,
      getScopedSavedObjectsClient,
      isESOUsingEphemeralEncryptionKey: false,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredActions: [],
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '234',
      type: 'action_task_params',
      attributes: {},
      references: [],
    });

    await executeFn({
      id: '123',
      params: { baz: false },
      spaceId: 'default',
      apiKey: Buffer.from('123:abc').toString('base64'),
    });
    expect(getScopedSavedObjectsClient).toHaveBeenCalledWith({
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

  test(`doesn't use API keys when not provided`, async () => {
    const getScopedSavedObjectsClient = jest.fn().mockReturnValueOnce(savedObjectsClient);
    const executeFn = createExecuteFunction({
      getBasePath,
      taskManager: mockTaskManager,
      getScopedSavedObjectsClient,
      isESOUsingEphemeralEncryptionKey: false,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredActions: [],
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    savedObjectsClient.create.mockResolvedValueOnce({
      id: '234',
      type: 'action_task_params',
      attributes: {},
      references: [],
    });

    await executeFn({
      id: '123',
      params: { baz: false },
      spaceId: 'default',
      apiKey: null,
    });
    expect(getScopedSavedObjectsClient).toHaveBeenCalledWith({
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

  test('throws when passing isESOUsingEphemeralEncryptionKey with true as a value', async () => {
    const getScopedSavedObjectsClient = jest.fn().mockReturnValueOnce(savedObjectsClient);
    const executeFn = createExecuteFunction({
      getBasePath,
      taskManager: mockTaskManager,
      getScopedSavedObjectsClient,
      isESOUsingEphemeralEncryptionKey: true,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredActions: [],
    });
    await expect(
      executeFn({
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        apiKey: null,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to execute action due to the Encrypted Saved Objects plugin using an ephemeral encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in kibana.yml"`
    );
  });

  test('should ensure action type is enabled', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const getScopedSavedObjectsClient = jest.fn().mockReturnValueOnce(savedObjectsClient);
    const executeFn = createExecuteFunction({
      getBasePath,
      taskManager: mockTaskManager,
      getScopedSavedObjectsClient,
      isESOUsingEphemeralEncryptionKey: false,
      actionTypeRegistry: mockedActionTypeRegistry,
      preconfiguredActions: [],
    });
    mockedActionTypeRegistry.ensureActionTypeEnabled.mockImplementation(() => {
      throw new Error('Fail');
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        actionTypeId: 'mock-action',
      },
      references: [],
    });

    await expect(
      executeFn({
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        apiKey: null,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

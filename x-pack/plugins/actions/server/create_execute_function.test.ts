/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { taskManagerMock } from '../../task_manager/server/task_manager.mock';
import { createExecutionEnqueuerFunction } from './create_execute_function';
import { savedObjectsClientMock } from '../../../../src/core/server/mocks';
import { actionTypeRegistryMock } from './action_type_registry.mock';

const mockTaskManager = taskManagerMock.start();
const savedObjectsClient = savedObjectsClientMock.create();

beforeEach(() => jest.resetAllMocks());

describe('execute()', () => {
  test('schedules the action with all given parameters', async () => {
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
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
    await executeFn(savedObjectsClient, {
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
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
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
    await executeFn(savedObjectsClient, {
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

  test('throws when passing isESOUsingEphemeralEncryptionKey with true as a value', async () => {
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOUsingEphemeralEncryptionKey: true,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredActions: [],
    });
    await expect(
      executeFn(savedObjectsClient, {
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
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
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
      executeFn(savedObjectsClient, {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        apiKey: null,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });

  test('should skip ensure action type if action type is preconfigured and license is valid', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOUsingEphemeralEncryptionKey: false,
      actionTypeRegistry: mockedActionTypeRegistry,
      preconfiguredActions: [
        {
          actionTypeId: 'mock-action',
          config: {},
          id: 'my-slack1',
          name: 'Slack #xyz',
          secrets: {},
          isPreconfigured: true,
        },
      ],
    });
    mockedActionTypeRegistry.isActionExecutable.mockImplementation(() => true);
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

    await executeFn(savedObjectsClient, {
      id: '123',
      params: { baz: false },
      spaceId: 'default',
      apiKey: null,
    });

    expect(mockedActionTypeRegistry.ensureActionTypeEnabled).not.toHaveBeenCalled();
  });
});

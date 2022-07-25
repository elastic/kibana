/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import uuid from 'uuid';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createExecutionEnqueuerFunction } from './create_execute_function';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { actionTypeRegistryMock } from './action_type_registry.mock';
import {
  asHttpRequestExecutionSource,
  asSavedObjectExecutionSource,
} from './lib/action_execution_source';

const mockTaskManager = taskManagerMock.createStart();
const savedObjectsClient = savedObjectsClientMock.create();
const request = {} as KibanaRequest;

beforeEach(() => jest.resetAllMocks());

describe('execute()', () => {
  test('schedules the action with all given parameters', async () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry,
      isESOCanEncrypt: true,
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
      executionId: '123abc',
      apiKey: Buffer.from('123:abc').toString('base64'),
      source: asHttpRequestExecutionSource(request),
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
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'action_task_params',
      {
        actionId: '123',
        params: { baz: false },
        executionId: '123abc',
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      {
        references: [
          {
            id: '123',
            name: 'actionRef',
            type: 'action',
          },
        ],
      }
    );
    expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('123', 'mock-action', {
      notifyUsage: true,
    });
  });

  test('schedules the action with all given parameters and consumer', async () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry,
      isESOCanEncrypt: true,
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
      executionId: '123abc',
      consumer: 'test-consumer',
      apiKey: Buffer.from('123:abc').toString('base64'),
      source: asHttpRequestExecutionSource(request),
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
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'action_task_params',
      {
        actionId: '123',
        params: { baz: false },
        executionId: '123abc',
        consumer: 'test-consumer',
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      {
        references: [
          {
            id: '123',
            name: 'actionRef',
            type: 'action',
          },
        ],
      }
    );
    expect(actionTypeRegistry.isActionExecutable).toHaveBeenCalledWith('123', 'mock-action', {
      notifyUsage: true,
    });
  });

  test('schedules the action with all given parameters and relatedSavedObjects', async () => {
    const actionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry,
      isESOCanEncrypt: true,
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
      source: asHttpRequestExecutionSource(request),
      executionId: '123abc',
      relatedSavedObjects: [
        {
          id: 'some-id',
          namespace: 'some-namespace',
          type: 'some-type',
          typeId: 'some-typeId',
        },
      ],
    });
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'action_task_params',
      {
        actionId: '123',
        params: { baz: false },
        apiKey: Buffer.from('123:abc').toString('base64'),
        executionId: '123abc',
        relatedSavedObjects: [
          {
            id: 'related_some-type_0',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
      },
      {
        references: [
          {
            id: '123',
            name: 'actionRef',
            type: 'action',
          },
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
        ],
      }
    );
  });

  test('schedules the action with all given parameters with a preconfigured action', async () => {
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      preconfiguredActions: [
        {
          id: '123',
          actionTypeId: 'mock-action-preconfigured',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });
    const source = { type: 'alert', id: uuid.v4() };

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
      executionId: '123abc',
      apiKey: Buffer.from('123:abc').toString('base64'),
      source: asSavedObjectExecutionSource(source),
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
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'action_task_params',
      {
        actionId: '123',
        params: { baz: false },
        executionId: '123abc',
        apiKey: Buffer.from('123:abc').toString('base64'),
      },
      {
        references: [
          {
            id: source.id,
            name: 'source',
            type: source.type,
          },
        ],
      }
    );
  });

  test('schedules the action with all given parameters with a preconfigured action and relatedSavedObjects', async () => {
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      isESOCanEncrypt: true,
      preconfiguredActions: [
        {
          id: '123',
          actionTypeId: 'mock-action-preconfigured',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });
    const source = { type: 'alert', id: uuid.v4() };

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
      source: asSavedObjectExecutionSource(source),
      executionId: '123abc',
      relatedSavedObjects: [
        {
          id: 'some-id',
          namespace: 'some-namespace',
          type: 'some-type',
          typeId: 'some-typeId',
        },
      ],
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
    expect(savedObjectsClient.create).toHaveBeenCalledWith(
      'action_task_params',
      {
        actionId: '123',
        params: { baz: false },
        apiKey: Buffer.from('123:abc').toString('base64'),
        executionId: '123abc',
        relatedSavedObjects: [
          {
            id: 'related_some-type_0',
            namespace: 'some-namespace',
            type: 'some-type',
            typeId: 'some-typeId',
          },
        ],
      },
      {
        references: [
          {
            id: source.id,
            name: 'source',
            type: source.type,
          },
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
        ],
      }
    );
  });

  test('throws when passing isESOCanEncrypt with false as a value', async () => {
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: false,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredActions: [],
    });
    await expect(
      executeFn(savedObjectsClient, {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to execute action because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command."`
    );
  });

  test('throws when isMissingSecrets is true for connector', async () => {
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
      actionTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredActions: [],
    });
    savedObjectsClient.get.mockResolvedValueOnce({
      id: '123',
      type: 'action',
      attributes: {
        name: 'mock-action',
        isMissingSecrets: true,
        actionTypeId: 'mock-action',
      },
      references: [],
    });
    await expect(
      executeFn(savedObjectsClient, {
        id: '123',
        params: { baz: false },
        spaceId: 'default',
        executionId: '123abc',
        apiKey: null,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Unable to execute action because no secrets are defined for the \\"mock-action\\" connector."`
    );
  });

  test('should ensure action type is enabled', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
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
        executionId: '123abc',
        apiKey: null,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });

  test('should skip ensure action type if action type is preconfigured and license is valid', async () => {
    const mockedActionTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      isESOCanEncrypt: true,
      actionTypeRegistry: mockedActionTypeRegistry,
      preconfiguredActions: [
        {
          actionTypeId: 'mock-action',
          config: {},
          id: 'my-slack1',
          name: 'Slack #xyz',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
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
      executionId: '123abc',
      apiKey: null,
    });

    expect(mockedActionTypeRegistry.ensureActionTypeEnabled).not.toHaveBeenCalled();
  });
});

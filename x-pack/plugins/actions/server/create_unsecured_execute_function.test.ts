/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createBulkUnsecuredExecutionEnqueuerFunction } from './create_unsecured_execute_function';
import { actionTypeRegistryMock } from './action_type_registry.mock';
import { asSavedObjectExecutionSource } from './lib/action_execution_source';

const mockTaskManager = taskManagerMock.createStart();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();

beforeEach(() => jest.resetAllMocks());

describe('bulkExecute()', () => {
  test('schedules the actions with all given parameters with a preconfigured connector', async () => {
    const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      connectorTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredConnectors: [
        {
          id: '123',
          actionTypeId: '.email',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });

    internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
        {
          id: '345',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });
    await executeFn(internalSavedObjectsRepository, [
      {
        id: '123',
        params: { baz: false },
      },
      {
        id: '123',
        params: { baz: true },
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
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
            "taskType": "actions:.email",
          },
          Object {
            "params": Object {
              "actionTaskParamsId": "345",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:.email",
          },
        ],
      ]
  `);

    expect(internalSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith([
      {
        type: 'action_task_params',
        attributes: {
          actionId: '123',
          params: { baz: false },
          apiKey: null,
        },
        references: [],
      },
      {
        type: 'action_task_params',
        attributes: {
          actionId: '123',
          params: { baz: true },
          apiKey: null,
        },
        references: [],
      },
    ]);
  });

  test('schedules the actions with all given parameters with a preconfigured connector and source specified', async () => {
    const sourceUuid = uuid();
    const source = { type: 'alert', id: sourceUuid };
    const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      connectorTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredConnectors: [
        {
          id: '123',
          actionTypeId: '.email',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });

    internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [
            {
              id: sourceUuid,
              name: 'source',
              type: 'alert',
            },
          ],
        },
        {
          id: '345',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [],
        },
      ],
    });
    await executeFn(internalSavedObjectsRepository, [
      {
        id: '123',
        params: { baz: false },
        source: asSavedObjectExecutionSource(source),
      },
      {
        id: '123',
        params: { baz: true },
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
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
            "taskType": "actions:.email",
          },
          Object {
            "params": Object {
              "actionTaskParamsId": "345",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:.email",
          },
        ],
      ]
  `);

    expect(internalSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith([
      {
        type: 'action_task_params',
        attributes: {
          actionId: '123',
          params: { baz: false },
          apiKey: null,
        },
        references: [
          {
            id: sourceUuid,
            name: 'source',
            type: 'alert',
          },
        ],
      },
      {
        type: 'action_task_params',
        attributes: {
          actionId: '123',
          params: { baz: true },
          apiKey: null,
        },
        references: [],
      },
    ]);
  });

  test('schedules the actions with all given parameters with a preconfigured connector and relatedSavedObjects specified', async () => {
    const sourceUuid = uuid();
    const source = { type: 'alert', id: sourceUuid };
    const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      connectorTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredConnectors: [
        {
          id: '123',
          actionTypeId: '.email',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });

    internalSavedObjectsRepository.bulkCreate.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '234',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [
            {
              id: sourceUuid,
              name: 'source',
              type: 'alert',
            },
          ],
        },
        {
          id: '345',
          type: 'action_task_params',
          attributes: {
            actionId: '123',
          },
          references: [
            {
              id: 'some-id',
              name: 'related_some-type_0',
              type: 'some-type',
            },
          ],
        },
      ],
    });
    await executeFn(internalSavedObjectsRepository, [
      {
        id: '123',
        params: { baz: false },
        source: asSavedObjectExecutionSource(source),
      },
      {
        id: '123',
        params: { baz: true },
        relatedSavedObjects: [
          {
            id: 'some-id',
            namespace: 'some-namespace',
            type: 'some-type',
          },
        ],
      },
    ]);
    expect(mockTaskManager.bulkSchedule).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.bulkSchedule.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
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
            "taskType": "actions:.email",
          },
          Object {
            "params": Object {
              "actionTaskParamsId": "345",
              "spaceId": "default",
            },
            "scope": Array [
              "actions",
            ],
            "state": Object {},
            "taskType": "actions:.email",
          },
        ],
      ]
  `);

    expect(internalSavedObjectsRepository.bulkCreate).toHaveBeenCalledWith([
      {
        type: 'action_task_params',
        attributes: {
          actionId: '123',
          params: { baz: false },
          apiKey: null,
        },
        references: [
          {
            id: sourceUuid,
            name: 'source',
            type: 'alert',
          },
        ],
      },
      {
        type: 'action_task_params',
        attributes: {
          actionId: '123',
          params: { baz: true },
          apiKey: null,
          relatedSavedObjects: [
            {
              id: 'related_some-type_0',
              namespace: 'some-namespace',
              type: 'some-type',
            },
          ],
        },
        references: [
          {
            id: 'some-id',
            name: 'related_some-type_0',
            type: 'some-type',
          },
        ],
      },
    ]);
  });

  test('throws when scheduling action using non preconfigured connector', async () => {
    const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      connectorTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredConnectors: [
        {
          id: '123',
          actionTypeId: '.email',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });
    await expect(
      executeFn(internalSavedObjectsRepository, [
        {
          id: '123',
          params: { baz: false },
        },
        {
          id: 'not-preconfigured',
          params: { baz: true },
        },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"not-preconfigured are not preconfigured connectors and can't be scheduled for unsecured actions execution"`
    );
  });

  test('throws when connector type is not enabled', async () => {
    const mockedConnectorTypeRegistry = actionTypeRegistryMock.create();
    const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      connectorTypeRegistry: mockedConnectorTypeRegistry,
      preconfiguredConnectors: [
        {
          id: '123',
          actionTypeId: '.email',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });
    mockedConnectorTypeRegistry.ensureActionTypeEnabled.mockImplementation(() => {
      throw new Error('Fail');
    });

    await expect(
      executeFn(internalSavedObjectsRepository, [
        {
          id: '123',
          params: { baz: false },
        },
        {
          id: '123',
          params: { baz: true },
        },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });

  test('throws when scheduling action using non allow-listed preconfigured connector', async () => {
    const executeFn = createBulkUnsecuredExecutionEnqueuerFunction({
      taskManager: mockTaskManager,
      connectorTypeRegistry: actionTypeRegistryMock.create(),
      preconfiguredConnectors: [
        {
          id: '123',
          actionTypeId: '.email',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
        {
          id: '456',
          actionTypeId: 'not-in-allowlist',
          config: {},
          isPreconfigured: true,
          isDeprecated: false,
          name: 'x',
          secrets: {},
        },
      ],
    });
    await expect(
      executeFn(internalSavedObjectsRepository, [
        {
          id: '123',
          params: { baz: false },
        },
        {
          id: '456',
          params: { baz: true },
        },
      ])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"not-in-allowlist actions cannot be scheduled for unsecured actions execution"`
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../get_create_task_runner_function', () => ({
  getCreateTaskRunnerFunction: jest.fn(),
}));

import { taskManagerMock } from '../../../task_manager/task_manager.mock';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/plugin.mock';
import { ActionTypeRegistry } from '../action_type_registry';

const mockTaskManager = taskManagerMock.create();

const services = {
  log: jest.fn(),
};
const actionTypeRegistryParams = {
  services,
  taskManager: mockTaskManager,
  encryptedSavedObjectsPlugin: encryptedSavedObjectsMock.create(),
};

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register action types', () => {
    const executor = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCreateTaskRunnerFunction } = require('../get_create_task_runner_function');
    getCreateTaskRunnerFunction.mockReturnValueOnce(jest.fn());
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
    expect(mockTaskManager.registerTaskDefinitions).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "actions:my-action-type": Object {
          "createTaskRunner": [MockFunction],
          "title": "My action type",
          "type": "actions:my-action-type",
        },
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": undefined,
    },
  ],
}
`);
    expect(getCreateTaskRunnerFunction).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "actionType": Object {
          "executor": [MockFunction],
          "id": "my-action-type",
          "name": "My action type",
        },
        "encryptedSavedObjectsPlugin": Object {
          "getDecryptedAsInternalUser": [MockFunction],
          "isEncryptionError": [MockFunction],
          "registerType": [MockFunction],
        },
        "services": Object {
          "log": [MockFunction],
        },
      },
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": [MockFunction],
    },
  ],
}
`);
  });

  test('throws error if action type already registered', () => {
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(() =>
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        executor,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is already registered."`
    );
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionType = actionTypeRegistry.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
Object {
  "executor": [Function],
  "id": "my-action-type",
  "name": "My action type",
}
`);
  });

  test(`throws an error when action type doesn't exist`, () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    expect(() => actionTypeRegistry.get('my-action-type')).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});

describe('getUnencryptedAttributes()', () => {
  test('returns empty array when unencryptedAttributes is undefined', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const result = actionTypeRegistry.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual([]);
  });

  test('returns values inside unencryptedAttributes array when it exists', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'b', 'c'],
      async executor() {},
    });
    const result = actionTypeRegistry.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionTypes = actionTypeRegistry.list();
    expect(actionTypes).toEqual([
      {
        id: 'my-action-type',
        name: 'My action type',
      },
    ]);
  });
});

describe('has()', () => {
  test('returns false for unregistered action types', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    expect(actionTypeRegistry.has('my-action-type')).toEqual(false);
  });

  test('returns true after registering an action type', () => {
    const executor = jest.fn();
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type'));
  });
});

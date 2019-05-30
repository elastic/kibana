/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../get_create_task_runner_function', () => ({
  getCreateTaskRunnerFunction: jest.fn(),
}));

import { taskManagerMock } from './task_manager.mock';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';
import { ActionTypeService } from '../action_type_service';

const mockTaskManager = taskManagerMock.create();

const mockEncryptedSavedObjectsPlugin = {
  getDecryptedAsInternalUser: jest.fn() as EncryptedSavedObjectsPlugin['getDecryptedAsInternalUser'],
} as EncryptedSavedObjectsPlugin;

const services = {
  log: jest.fn(),
};

const actionTypeServiceParams = {
  services,
  taskManager: mockTaskManager,
  encryptedSavedObjectsPlugin: mockEncryptedSavedObjectsPlugin,
};

beforeEach(() => jest.resetAllMocks());

describe('register()', () => {
  test('able to register action types', () => {
    const executor = jest.fn();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCreateTaskRunnerFunction } = require('../get_create_task_runner_function');
    getCreateTaskRunnerFunction.mockReturnValueOnce(jest.fn());
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeService.has('my-action-type')).toEqual(true);
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(() =>
      actionTypeService.register({
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionType = actionTypeService.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
Object {
  "executor": [Function],
  "id": "my-action-type",
  "name": "My action type",
}
`);
  });

  test(`throws an error when action type doesn't exist`, () => {
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    expect(() => actionTypeService.get('my-action-type')).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is not registered."`
    );
  });
});

describe('getUnencryptedAttributes()', () => {
  test('returns empty array when unencryptedAttributes is undefined', () => {
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const result = actionTypeService.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual([]);
  });

  test('returns values inside unencryptedAttributes array when it exists', () => {
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      unencryptedAttributes: ['a', 'b', 'c'],
      async executor() {},
    });
    const result = actionTypeService.getUnencryptedAttributes('my-action-type');
    expect(result).toEqual(['a', 'b', 'c']);
  });
});

describe('list()', () => {
  test('returns list of action types', () => {
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      async executor() {},
    });
    const actionTypes = actionTypeService.list();
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
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    expect(actionTypeService.has('my-action-type')).toEqual(false);
  });

  test('returns true after registering an action type', () => {
    const executor = jest.fn();
    const actionTypeService = new ActionTypeService(actionTypeServiceParams);
    actionTypeService.register({
      id: 'my-action-type',
      name: 'My action type',
      executor,
    });
    expect(actionTypeService.has('my-action-type'));
  });
});

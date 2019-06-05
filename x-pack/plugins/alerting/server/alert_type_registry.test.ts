/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./lib/get_create_task_runner_function', () => ({
  getCreateTaskRunnerFunction: jest.fn().mockReturnValue(jest.fn()),
}));

import { AlertTypeRegistry } from './alert_type_registry';
import { savedObjectsClientMock } from './__mocks__/saved_objects_client.mock';
import { taskManagerMock } from '../../task_manager/task_manager.mock';

const alertTypeRegistryParams = {
  fireAction: jest.fn(),
  taskManager: taskManagerMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
};

beforeEach(() => jest.resetAllMocks());

describe('has()', () => {
  test('returns false for unregistered alert types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    expect(registry.has('foo')).toEqual(false);
  });

  test('returns true for registered alert types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'foo',
      description: 'Foo',
      execute: jest.fn(),
    });
    expect(registry.has('foo')).toEqual(true);
  });
});

describe('registry()', () => {
  test('registers the executor with the task manager', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCreateTaskRunnerFunction } = require('./lib/get_create_task_runner_function');
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      description: 'Test',
      execute: jest.fn(),
    });
    expect(alertTypeRegistryParams.taskManager.registerTaskDefinitions).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      Object {
        "alerting:test": Object {
          "createTaskRunner": undefined,
          "title": "Test",
          "type": "alerting:test",
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
        "alertType": Object {
          "description": "Test",
          "execute": [MockFunction],
          "id": "test",
        },
        "fireAction": [MockFunction],
        "savedObjectsClient": Object {
          "bulkCreate": [MockFunction],
          "bulkGet": [MockFunction],
          "create": [MockFunction],
          "delete": [MockFunction],
          "errors": Object {},
          "find": [MockFunction],
          "get": [MockFunction],
          "update": [MockFunction],
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
  });

  test('should throw an error if type is already registered', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      description: 'Test',
      execute: jest.fn(),
    });
    expect(() =>
      registry.register({
        id: 'test',
        description: 'Test',
        execute: jest.fn(),
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Alert type \\"test\\" is already registered."`);
  });
});

describe('get()', () => {
  test('should return registered type', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      description: 'Test',
      execute: jest.fn(),
    });
    const alertType = registry.get('test');
    expect(alertType).toMatchInlineSnapshot(`
Object {
  "description": "Test",
  "execute": [MockFunction],
  "id": "test",
}
`);
  });

  test(`should throw an error if type isn't registered`, () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    expect(() => registry.get('test')).toThrowErrorMatchingInlineSnapshot(
      `"Alert type \\"test\\" is not registered."`
    );
  });
});

describe('list()', () => {
  test('should return empty when nothing is registered', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    const result = registry.list();
    expect(result).toMatchInlineSnapshot(`Array []`);
  });

  test('should return registered types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      description: 'Test',
      execute: jest.fn(),
    });
    const result = registry.list();
    expect(result).toMatchInlineSnapshot(`
Array [
  Object {
    "description": "Test",
    "id": "test",
  },
]
`);
  });
});

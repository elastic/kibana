/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TaskRunnerFactory } from './task_runner';
import { AlertTypeRegistry } from './alert_type_registry';
import { AlertType } from './types';
import { taskManagerMock } from '../../task_manager/server/task_manager.mock';

const taskManager = taskManagerMock.setup();
const alertTypeRegistryParams = {
  taskManager,
  taskRunnerFactory: new TaskRunnerFactory(),
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
      name: 'Foo',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    });
    expect(registry.has('foo')).toEqual(true);
  });
});

describe('register()', () => {
  test('throws if AlertType Id contains invalid characters', () => {
    const alertType = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);

    const invalidCharacters = [' ', ':', '*', '*', '/'];
    for (const char of invalidCharacters) {
      expect(() => registry.register({ ...alertType, id: `${alertType.id}${char}` })).toThrowError(
        new Error(`expected AlertType Id not to include invalid character: ${char}`)
      );
    }

    const [first, second] = invalidCharacters;
    expect(() =>
      registry.register({ ...alertType, id: `${first}${alertType.id}${second}` })
    ).toThrowError(
      new Error(`expected AlertType Id not to include invalid characters: ${first}, ${second}`)
    );
  });

  test('throws if AlertType Id isnt a string', () => {
    const alertType = {
      id: (123 as unknown) as string,
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);

    expect(() => registry.register(alertType)).toThrowError(
      new Error(`expected value of type [string] but got [number]`)
    );
  });

  test('registers the executor with the task manager', () => {
    const alertType = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register(alertType);
    expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(taskManager.registerTaskDefinitions.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alerting:test": Object {
            "createTaskRunner": [Function],
            "title": "Test",
            "type": "alerting:test",
          },
        },
      ]
    `);
  });

  test('shallow clones the given alert type', () => {
    const alertType: AlertType = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register(alertType);
    alertType.name = 'Changed';
    expect(registry.get('test').name).toEqual('Test');
  });

  test('should throw an error if type is already registered', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    });
    expect(() =>
      registry.register({
        id: 'test',
        name: 'Test',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        executor: jest.fn(),
        producer: 'alerts',
      })
    ).toThrowErrorMatchingInlineSnapshot(`"Alert type \\"test\\" is already registered."`);
  });
});

describe('get()', () => {
  test('should return registered type', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      executor: jest.fn(),
      producer: 'alerts',
    });
    const alertType = registry.get('test');
    expect(alertType).toMatchInlineSnapshot(`
      Object {
        "actionGroups": Array [
          Object {
            "id": "default",
            "name": "Default",
          },
        ],
        "actionVariables": Object {
          "context": Array [],
          "params": Array [],
          "state": Array [],
        },
        "defaultActionGroupId": "default",
        "executor": [MockFunction],
        "id": "test",
        "name": "Test",
        "producer": "alerts",
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
    expect(result).toMatchInlineSnapshot(`Set {}`);
  });

  test('should return registered types', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register({
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'testActionGroup',
          name: 'Test Action Group',
        },
      ],
      defaultActionGroupId: 'testActionGroup',
      executor: jest.fn(),
      producer: 'alerts',
    });
    const result = registry.list();
    expect(result).toMatchInlineSnapshot(`
      Set {
        Object {
          "actionGroups": Array [
            Object {
              "id": "testActionGroup",
              "name": "Test Action Group",
            },
          ],
          "actionVariables": Object {
            "context": Array [],
            "params": Array [],
            "state": Array [],
          },
          "defaultActionGroupId": "testActionGroup",
          "id": "test",
          "name": "Test",
          "producer": "alerts",
        },
      }
    `);
  });

  test('should return action variables state and empty context', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register(alertTypeWithVariables('x', '', 's'));
    const alertType = registry.get('x');
    expect(alertType.actionVariables).toBeTruthy();

    const context = alertType.actionVariables!.context;
    const state = alertType.actionVariables!.state;

    expect(context).toBeTruthy();
    expect(context!.length).toBe(0);

    expect(state).toBeTruthy();
    expect(state!.length).toBe(1);
    expect(state![0]).toEqual({ name: 's', description: 'x state' });
  });

  test('should return action variables context and empty state', () => {
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register(alertTypeWithVariables('x', 'c', ''));
    const alertType = registry.get('x');
    expect(alertType.actionVariables).toBeTruthy();

    const context = alertType.actionVariables!.context;
    const state = alertType.actionVariables!.state;

    expect(state).toBeTruthy();
    expect(state!.length).toBe(0);

    expect(context).toBeTruthy();
    expect(context!.length).toBe(1);
    expect(context![0]).toEqual({ name: 'c', description: 'x context' });
  });
});

function alertTypeWithVariables(id: string, context: string, state: string): AlertType {
  const baseAlert = {
    id,
    name: `${id}-name`,
    actionGroups: [],
    defaultActionGroupId: id,
    async executor() {},
    producer: 'alerts',
  };

  if (!context && !state) return baseAlert;

  return {
    ...baseAlert,
    actionVariables: {
      ...(context ? { context: [{ name: context, description: `${id} context` }] } : {}),
      ...(state ? { state: [{ name: state, description: `${id} state` }] } : {}),
    },
  };
}

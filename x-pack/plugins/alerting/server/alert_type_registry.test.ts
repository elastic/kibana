/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskRunnerFactory } from './task_runner';
import { AlertTypeRegistry, ConstructorOptions } from './alert_type_registry';
import { ActionGroup, AlertType } from './types';
import { taskManagerMock } from '../../task_manager/server/mocks';
import { ILicenseState } from './lib/license_state';
import { licenseStateMock } from './lib/license_state.mock';
import { licensingMock } from '../../licensing/server/mocks';
let mockedLicenseState: jest.Mocked<ILicenseState>;
let alertTypeRegistryParams: ConstructorOptions;

const taskManager = taskManagerMock.createSetup();

beforeEach(() => {
  jest.resetAllMocks();
  mockedLicenseState = licenseStateMock.create();
  alertTypeRegistryParams = {
    taskManager,
    taskRunnerFactory: new TaskRunnerFactory(),
    licenseState: mockedLicenseState,
    licensing: licensingMock.createSetup(),
  };
});

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
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: jest.fn(),
      producer: 'alerts',
    });
    expect(registry.has('foo')).toEqual(true);
  });
});

describe('register()', () => {
  test('throws if AlertType Id contains invalid characters', () => {
    const alertType: AlertType<never, never, never, never, 'default'> = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
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
    const alertType: AlertType<never, never, never, never, 'default'> = {
      id: (123 as unknown) as string,
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);

    expect(() => registry.register(alertType)).toThrowError(
      new Error(`expected value of type [string] but got [number]`)
    );
  });

  test('throws if AlertType action groups contains reserved group id', () => {
    const alertType: AlertType<never, never, never, never, 'default' | 'NotReserved'> = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        /**
         * The type system will ensure you can't use the `recovered` action group
         * but we also want to ensure this at runtime
         */
        ({
          id: 'recovered',
          name: 'Recovered',
        } as unknown) as ActionGroup<'NotReserved'>,
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);

    expect(() => registry.register(alertType)).toThrowError(
      new Error(
        `Alert type [id="${alertType.id}"] cannot be registered. Action groups [recovered] are reserved by the framework.`
      )
    );
  });

  test('allows an AlertType to specify a custom recovery group', () => {
    const alertType: AlertType<never, never, never, never, 'default', 'backToAwesome'> = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      recoveryActionGroup: {
        id: 'backToAwesome',
        name: 'Back To Awesome',
      },
      executor: jest.fn(),
      producer: 'alerts',
      minimumLicenseRequired: 'basic',
      isExportable: true,
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);
    registry.register(alertType);
    expect(registry.get('test').actionGroups).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "default",
          "name": "Default",
        },
        Object {
          "id": "backToAwesome",
          "name": "Back To Awesome",
        },
      ]
    `);
  });

  test('throws if the custom recovery group is contained in the AlertType action groups', () => {
    const alertType: AlertType<
      never,
      never,
      never,
      never,
      'default' | 'backToAwesome',
      'backToAwesome'
    > = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
        {
          id: 'backToAwesome',
          name: 'Back To Awesome',
        },
      ],
      recoveryActionGroup: {
        id: 'backToAwesome',
        name: 'Back To Awesome',
      },
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: jest.fn(),
      producer: 'alerts',
    };
    const registry = new AlertTypeRegistry(alertTypeRegistryParams);

    expect(() => registry.register(alertType)).toThrowError(
      new Error(
        `Alert type [id="${alertType.id}"] cannot be registered. Action group [backToAwesome] cannot be used as both a recovery and an active action group.`
      )
    );
  });

  test('registers the executor with the task manager', () => {
    const alertType: AlertType<never, never, never, never, 'default'> = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
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
          },
        },
      ]
    `);
  });

  test('shallow clones the given alert type', () => {
    const alertType: AlertType<never, never, never, never, 'default'> = {
      id: 'test',
      name: 'Test',
      actionGroups: [
        {
          id: 'default',
          name: 'Default',
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
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
      minimumLicenseRequired: 'basic',
      isExportable: true,
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
        minimumLicenseRequired: 'basic',
        isExportable: true,
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
      minimumLicenseRequired: 'basic',
      isExportable: true,
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
          Object {
            "id": "recovered",
            "name": "Recovered",
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
        "isExportable": true,
        "minimumLicenseRequired": "basic",
        "name": "Test",
        "producer": "alerts",
        "recoveryActionGroup": Object {
          "id": "recovered",
          "name": "Recovered",
        },
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
      isExportable: true,
      minimumLicenseRequired: 'basic',
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
            Object {
              "id": "recovered",
              "name": "Recovered",
            },
          ],
          "actionVariables": Object {
            "context": Array [],
            "params": Array [],
            "state": Array [],
          },
          "defaultActionGroupId": "testActionGroup",
          "enabledInLicense": false,
          "id": "test",
          "isExportable": true,
          "minimumLicenseRequired": "basic",
          "name": "Test",
          "producer": "alerts",
          "recoveryActionGroup": Object {
            "id": "recovered",
            "name": "Recovered",
          },
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

describe('ensureAlertTypeEnabled', () => {
  let alertTypeRegistry: AlertTypeRegistry;

  beforeEach(() => {
    alertTypeRegistry = new AlertTypeRegistry(alertTypeRegistryParams);
    alertTypeRegistry.register({
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
      isExportable: true,
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
    });
  });

  test('should call ensureLicenseForAlertType on the license state', async () => {
    alertTypeRegistry.ensureAlertTypeEnabled('test');
    expect(mockedLicenseState.ensureLicenseForAlertType).toHaveBeenCalled();
  });

  test('should throw when ensureLicenseForAlertType throws', async () => {
    mockedLicenseState.ensureLicenseForAlertType.mockImplementation(() => {
      throw new Error('Fail');
    });
    expect(() =>
      alertTypeRegistry.ensureAlertTypeEnabled('test')
    ).toThrowErrorMatchingInlineSnapshot(`"Fail"`);
  });
});

function alertTypeWithVariables<ActionGroupIds extends string>(
  id: ActionGroupIds,
  context: string,
  state: string
): AlertType<never, never, never, never, ActionGroupIds> {
  const baseAlert: AlertType<never, never, never, never, ActionGroupIds> = {
    id,
    name: `${id}-name`,
    actionGroups: [],
    defaultActionGroupId: id,
    isExportable: true,
    minimumLicenseRequired: 'basic',
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

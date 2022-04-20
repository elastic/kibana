/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskRunnerFactory } from './task_runner';
import { RuleTypeRegistry, ConstructorOptions } from './rule_type_registry';
import { ActionGroup, RuleType } from './types';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { ILicenseState } from './lib/license_state';
import { licenseStateMock } from './lib/license_state.mock';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const logger = loggingSystemMock.create().get();
let mockedLicenseState: jest.Mocked<ILicenseState>;
let ruleTypeRegistryParams: ConstructorOptions;

const taskManager = taskManagerMock.createSetup();

beforeEach(() => {
  jest.resetAllMocks();
  mockedLicenseState = licenseStateMock.create();
  ruleTypeRegistryParams = {
    logger,
    taskManager,
    taskRunnerFactory: new TaskRunnerFactory(),
    licenseState: mockedLicenseState,
    licensing: licensingMock.createSetup(),
    minimumScheduleInterval: { value: '1m', enforce: false },
  };
});

describe('Create Lifecycle', () => {
  describe('has()', () => {
    test('returns false for unregistered rule types', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      expect(registry.has('foo')).toEqual(false);
    });

    test('returns true for registered rule types', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      });
      expect(registry.has('foo')).toEqual(true);
    });
  });

  describe('register()', () => {
    test('throws if RuleType Id contains invalid characters', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);

      const invalidCharacters = [' ', ':', '*', '*', '/'];
      for (const char of invalidCharacters) {
        expect(() => registry.register({ ...ruleType, id: `${ruleType.id}${char}` })).toThrowError(
          new Error(`expected RuleType Id not to include invalid character: ${char}`)
        );
      }

      const [first, second] = invalidCharacters;
      expect(() =>
        registry.register({ ...ruleType, id: `${first}${ruleType.id}${second}` })
      ).toThrowError(
        new Error(`expected RuleType Id not to include invalid characters: ${first}, ${second}`)
      );
    });

    test('throws if RuleType Id isnt a string', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
        id: 123 as unknown as string,
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);

      expect(() => registry.register(ruleType)).toThrowError(
        new Error(`expected value of type [string] but got [number]`)
      );
    });

    test('throws if RuleType ruleTaskTimeout is not a valid duration', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
        id: '123',
        name: 'Test',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        ruleTaskTimeout: '23 milisec',
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        executor: jest.fn(),
        producer: 'alerts',
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);

      expect(() => registry.register(ruleType)).toThrowError(
        new Error(
          `Rule type \"123\" has invalid timeout: string is not a valid duration: 23 milisec.`
        )
      );
    });

    test('throws if defaultScheduleInterval isnt valid', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
        id: '123',
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
        defaultScheduleInterval: 'foobar',
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);

      expect(() => registry.register(ruleType)).toThrowError(
        new Error(
          `Rule type \"123\" has invalid default interval: string is not a valid duration: foobar.`
        )
      );
    });

    test('logs warning if defaultScheduleInterval is less than configured minimumScheduleInterval and enforce = false', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
        id: '123',
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
        defaultScheduleInterval: '10s',
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleType);

      expect(logger.warn).toHaveBeenCalledWith(
        `Rule type "123" has a default interval of "10s", which is less than the configured minimum of "1m".`
      );
    });

    test('logs warning and updates default if defaultScheduleInterval is less than configured minimumScheduleInterval and enforce = true', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
        id: '123',
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
        defaultScheduleInterval: '10s',
      };
      const registry = new RuleTypeRegistry({
        ...ruleTypeRegistryParams,
        minimumScheduleInterval: { value: '1m', enforce: true },
      });
      registry.register(ruleType);

      expect(logger.warn).toHaveBeenCalledWith(
        `Rule type "123" cannot specify a default interval less than the configured minimum of "1m". "1m" will be used.`
      );
      expect(registry.get('123').defaultScheduleInterval).toEqual('1m');
    });

    test('throws if RuleType action groups contains reserved group id', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default' | 'NotReserved'> = {
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
          {
            id: 'recovered',
            name: 'Recovered',
          } as unknown as ActionGroup<'NotReserved'>,
        ],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        executor: jest.fn(),
        producer: 'alerts',
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);

      expect(() => registry.register(ruleType)).toThrowError(
        new Error(
          `Rule type [id="${ruleType.id}"] cannot be registered. Action groups [recovered] are reserved by the framework.`
        )
      );
    });

    test('allows an RuleType to specify a custom recovery group', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default', 'backToAwesome'> = {
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleType);
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

    test('allows an RuleType to specify a custom rule task timeout', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default', 'backToAwesome'> = {
        id: 'test',
        name: 'Test',
        actionGroups: [
          {
            id: 'default',
            name: 'Default',
          },
        ],
        defaultActionGroupId: 'default',
        ruleTaskTimeout: '13m',
        executor: jest.fn(),
        producer: 'alerts',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleType);
      expect(registry.get('test').ruleTaskTimeout).toBe('13m');
    });

    test('throws if the custom recovery group is contained in the RuleType action groups', () => {
      const ruleType: RuleType<
        never,
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);

      expect(() => registry.register(ruleType)).toThrowError(
        new Error(
          `Rule type [id="${ruleType.id}"] cannot be registered. Action group [backToAwesome] cannot be used as both a recovery and an active action group.`
        )
      );
    });

    test('registers the executor with the task manager', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
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
        ruleTaskTimeout: '20m',
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleType);
      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(taskManager.registerTaskDefinitions.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "alerting:test": Object {
            "createTaskRunner": [Function],
            "timeout": "20m",
            "title": "Test",
          },
        },
      ]
    `);
    });

    test('shallow clones the given rule type', () => {
      const ruleType: RuleType<never, never, never, never, never, 'default'> = {
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      };
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleType);
      ruleType.name = 'Changed';
      expect(registry.get('test').name).toEqual('Test');
    });

    test('should throw an error if type is already registered', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
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
          config: {
            run: {
              actions: { max: 1000 },
            },
          },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Rule type \\"test\\" is already registered."`);
    });
  });

  describe('get()', () => {
    test('should return registered type', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      });
      const ruleType = registry.get('test');
      expect(ruleType).toMatchInlineSnapshot(`
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
        "config": Object {
          "run": Object {
            "actions": Object {
              "max": 1000,
            },
          },
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
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      expect(() => registry.get('test')).toThrowErrorMatchingInlineSnapshot(
        `"Rule type \\"test\\" is not registered."`
      );
    });
  });

  describe('list()', () => {
    test('should return empty when nothing is registered', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      const result = registry.list();
      expect(result).toMatchInlineSnapshot(`Set {}`);
    });

    test('should return registered types', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
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
        doesSetRecoveryContext: false,
        isExportable: true,
        ruleTaskTimeout: '20m',
        minimumLicenseRequired: 'basic',
        executor: jest.fn(),
        producer: 'alerts',
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
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
          "defaultScheduleInterval": undefined,
          "doesSetRecoveryContext": false,
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
          "ruleTaskTimeout": "20m",
        },
      }
    `);
    });

    test('should return action variables state and empty context', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleTypeWithVariables('x', '', 's'));
      const ruleType = registry.get('x');
      expect(ruleType.actionVariables).toBeTruthy();

      const context = ruleType.actionVariables!.context;
      const state = ruleType.actionVariables!.state;

      expect(context).toBeTruthy();
      expect(context!.length).toBe(0);

      expect(state).toBeTruthy();
      expect(state!.length).toBe(1);
      expect(state![0]).toEqual({ name: 's', description: 'x state' });
    });

    test('should return action variables context and empty state', () => {
      const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
      registry.register(ruleTypeWithVariables('x', 'c', ''));
      const ruleType = registry.get('x');
      expect(ruleType.actionVariables).toBeTruthy();

      const context = ruleType.actionVariables!.context;
      const state = ruleType.actionVariables!.state;

      expect(state).toBeTruthy();
      expect(state!.length).toBe(0);

      expect(context).toBeTruthy();
      expect(context!.length).toBe(1);
      expect(context![0]).toEqual({ name: 'c', description: 'x context' });
    });
  });

  describe('ensureRuleTypeEnabled', () => {
    let ruleTypeRegistry: RuleTypeRegistry;

    beforeEach(() => {
      ruleTypeRegistry = new RuleTypeRegistry(ruleTypeRegistryParams);
      ruleTypeRegistry.register({
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
        config: {
          run: {
            actions: { max: 1000 },
          },
        },
      });
    });

    test('should call ensureLicenseForAlertType on the license state', async () => {
      ruleTypeRegistry.ensureRuleTypeEnabled('test');
      expect(mockedLicenseState.ensureLicenseForRuleType).toHaveBeenCalled();
    });

    test('should throw when ensureLicenseForAlertType throws', async () => {
      mockedLicenseState.ensureLicenseForRuleType.mockImplementation(() => {
        throw new Error('Fail');
      });
      expect(() =>
        ruleTypeRegistry.ensureRuleTypeEnabled('test')
      ).toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    });
  });
});

function ruleTypeWithVariables<ActionGroupIds extends string>(
  id: ActionGroupIds,
  context: string,
  state: string
): RuleType<never, never, never, never, never, ActionGroupIds> {
  const baseAlert: RuleType<never, never, never, never, never, ActionGroupIds> = {
    id,
    name: `${id}-name`,
    actionGroups: [],
    defaultActionGroupId: id,
    isExportable: true,
    minimumLicenseRequired: 'basic',
    async executor() {},
    producer: 'alerts',
    config: {
      run: {
        actions: { max: 1000 },
      },
    },
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

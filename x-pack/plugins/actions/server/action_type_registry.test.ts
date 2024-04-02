/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { schema } from '@kbn/config-schema';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from './action_type_registry';
import { ActionType, ExecutorType } from './types';
import { ActionExecutor, ILicenseState, TaskRunnerFactory } from './lib';
import { actionsConfigMock } from './actions_config.mock';
import { licenseStateMock } from './lib/license_state.mock';
import { ActionsConfigurationUtilities } from './actions_config';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { inMemoryMetricsMock } from './monitoring/in_memory_metrics.mock';

const mockTaskManager = taskManagerMock.createSetup();
const inMemoryMetrics = inMemoryMetricsMock.create();
let mockedLicenseState: jest.Mocked<ILicenseState>;
let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
let actionTypeRegistryParams: ActionTypeRegistryOpts;

describe('actionTypeRegistry', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedLicenseState = licenseStateMock.create();
    mockedActionsConfig = actionsConfigMock.create();
    actionTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: mockTaskManager,
      taskRunnerFactory: new TaskRunnerFactory(
        new ActionExecutor({ isESOCanEncrypt: true }),
        inMemoryMetrics
      ),
      actionsConfigUtils: mockedActionsConfig,
      licenseState: mockedLicenseState,
      inMemoryConnectors: [
        {
          actionTypeId: 'foo',
          config: {},
          id: 'my-slack1',
          name: 'Slack #xyz',
          secrets: {},
          isPreconfigured: true,
          isDeprecated: false,
          isSystemAction: false,
        },
        {
          actionTypeId: 'test.system-action',
          config: {},
          id: 'system-connector-test.system-action',
          name: 'System action: test.system-action',
          secrets: {},
          isPreconfigured: false,
          isDeprecated: false,
          isSystemAction: true,
        },
      ],
    };
  });

  const executor: ExecutorType<{}, {}, {}, void> = async (options) => {
    return { status: 'ok', actionId: options.actionId };
  };

  describe('register()', () => {
    test('able to register action types', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register<{}, {}, {}, void>({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
      expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(mockTaskManager.registerTaskDefinitions.mock.calls[0]).toEqual(
        expect.objectContaining([
          {
            'actions:my-action-type': {
              createTaskRunner: expect.any(Function),
              maxAttempts: 3,
              title: 'My action type',
            },
          },
        ])
      );
      expect(actionTypeRegistryParams.licensing.featureUsage.register).toHaveBeenCalledWith(
        'Connector: My action type',
        'gold'
      );
    });

    test('shallow clones the given action type', () => {
      const myType: ActionType = {
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      };
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register(myType);
      myType.name = 'Changed';
      expect(actionTypeRegistry.get('my-action-type').name).toEqual('My action type');
    });

    test('throws error if action type already registered', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(() =>
        actionTypeRegistry.register({
          id: 'my-action-type',
          name: 'My action type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Action type \\"my-action-type\\" is already registered."`
      );
    });

    test('throws if empty supported feature ids provided', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      expect(() =>
        actionTypeRegistry.register({
          id: 'my-action-type',
          name: 'My action type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: [],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"At least one \\"supportedFeatureId\\" value must be supplied for connector type \\"my-action-type\\"."`
      );
    });

    test('throws if invalid feature ids provided', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      expect(() =>
        actionTypeRegistry.register({
          id: 'my-action-type',
          name: 'My action type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['foo'],
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Invalid feature ids \\"foo\\" for connector type \\"my-action-type\\"."`
      );
    });

    test('registers gold+ action types to the licensing feature usage API', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'gold',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(actionTypeRegistryParams.licensing.featureUsage.register).toHaveBeenCalledWith(
        'Connector: My action type',
        'gold'
      );
    });

    test(`doesn't register basic action types to the licensing feature usage API`, () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(actionTypeRegistryParams.licensing.featureUsage.register).not.toHaveBeenCalled();
    });

    test('allows registering system actions', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);

      expect(() =>
        actionTypeRegistry.register({
          id: 'my-action-type',
          name: 'My action type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: true,
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).not.toThrow();
    });

    test('throws if the kibana privileges are defined but the action type is not a system action type', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);

      expect(() =>
        actionTypeRegistry.register({
          id: 'my-action-type',
          name: 'My action type',
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          getKibanaPrivileges: jest.fn(),
          isSystemActionType: false,
          validate: {
            config: { schema: schema.object({}) },
            secrets: { schema: schema.object({}) },
            params: { schema: schema.object({}) },
          },
          executor,
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Kibana privilege authorization is only supported for system action types"`
      );
    });
  });

  describe('get()', () => {
    test('returns action type', () => {
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      const { validate, ...rest } = actionTypeRegistry.get('my-action-type');
      expect(validate).toBeDefined();
      expect(rest).toMatchInlineSnapshot(`
      Object {
        "executor": [Function],
        "id": "my-action-type",
        "minimumLicenseRequired": "basic",
        "name": "My action type",
        "supportedFeatureIds": Array [
          "alerting",
        ],
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

  describe('list()', () => {
    test('returns list of action types', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      const actionTypes = actionTypeRegistry.list();
      expect(actionTypes).toEqual([
        {
          id: 'my-action-type',
          name: 'My action type',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: false,
        },
      ]);
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalled();
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalled();
    });

    test('returns list of connector types filtered by feature id if provided', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      actionTypeRegistry.register({
        id: 'another-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['cases'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      const actionTypes = actionTypeRegistry.list('alerting');
      expect(actionTypes).toEqual([
        {
          id: 'my-action-type',
          name: 'My action type',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'basic',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: false,
        },
      ]);
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalled();
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalled();
    });

    test('sets the isSystemActionType correctly for system actions', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);

      actionTypeRegistry.register({
        id: 'test.system-action',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      const actionTypes = actionTypeRegistry.list();

      expect(actionTypes).toEqual([
        {
          id: 'test.system-action',
          name: 'Cases',
          enabled: true,
          enabledInConfig: true,
          enabledInLicense: true,
          minimumLicenseRequired: 'platinum',
          supportedFeatureIds: ['alerting'],
          isSystemActionType: true,
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
      const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });
      expect(actionTypeRegistry.has('my-action-type'));
    });
  });

  describe('isActionTypeEnabled', () => {
    let actionTypeRegistry: ActionTypeRegistry;

    const fooActionType: ActionType = {
      id: 'foo',
      name: 'Foo',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor: async (options) => {
        return { status: 'ok', actionId: options.actionId };
      },
    };

    const systemActionType: ActionType = {
      ...fooActionType,
      id: 'system-action-type',
      name: 'System action type',
      isSystemActionType: true,
    };

    beforeEach(() => {
      actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register(fooActionType);
      actionTypeRegistry.register(systemActionType);
    });

    test('should call isActionTypeEnabled of the actions config', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      actionTypeRegistry.isActionTypeEnabled('foo');
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalledWith('foo');
    });

    test('should call isActionExecutable of the actions config', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      actionTypeRegistry.isActionExecutable('my-slack1', 'foo');
      expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalledWith('foo');
    });

    test('should return true when isActionTypeEnabled is false and isLicenseValidForActionType is true and it has preconfigured connectors', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      expect(actionTypeRegistry.isActionExecutable('my-slack1', 'foo')).toEqual(true);
    });

    test('should return true when isActionTypeEnabled is false and isLicenseValidForActionType is true and it has system connectors', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      expect(
        actionTypeRegistry.isActionExecutable(
          'system-connector-test.system-action',
          'system-action-type'
        )
      ).toEqual(true);
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage false by default', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      actionTypeRegistry.isActionTypeEnabled('foo');
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
        notifyUsage: false,
      });
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage true when specified', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      actionTypeRegistry.isActionTypeEnabled('foo', { notifyUsage: true });
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
        notifyUsage: true,
      });
    });

    test('should return false when isActionTypeEnabled is false and isLicenseValidForActionType is true', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(false);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      expect(actionTypeRegistry.isActionTypeEnabled('foo')).toEqual(false);
    });

    test('should return false when isActionTypeEnabled is true and isLicenseValidForActionType is false', async () => {
      mockedActionsConfig.isActionTypeEnabled.mockReturnValue(true);
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({
        isValid: false,
        reason: 'invalid',
      });
      expect(actionTypeRegistry.isActionTypeEnabled('foo')).toEqual(false);
    });
  });

  describe('ensureActionTypeEnabled', () => {
    let actionTypeRegistry: ActionTypeRegistry;
    const fooActionType: ActionType = {
      id: 'foo',
      name: 'Foo',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor: async (options) => {
        return { status: 'ok', actionId: options.actionId };
      },
    };

    beforeEach(() => {
      actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register(fooActionType);
    });

    test('should call ensureActionTypeEnabled of the action config', async () => {
      actionTypeRegistry.ensureActionTypeEnabled('foo');
      expect(mockedActionsConfig.ensureActionTypeEnabled).toHaveBeenCalledWith('foo');
    });

    test('should call ensureLicenseForActionType on the license state', async () => {
      actionTypeRegistry.ensureActionTypeEnabled('foo');
      expect(mockedLicenseState.ensureLicenseForActionType).toHaveBeenCalledWith(fooActionType);
    });

    test('should throw when ensureActionTypeEnabled throws', async () => {
      mockedActionsConfig.ensureActionTypeEnabled.mockImplementation(() => {
        throw new Error('Fail');
      });
      expect(() =>
        actionTypeRegistry.ensureActionTypeEnabled('foo')
      ).toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    });

    test('should throw when ensureLicenseForActionType throws', async () => {
      mockedLicenseState.ensureLicenseForActionType.mockImplementation(() => {
        throw new Error('Fail');
      });
      expect(() =>
        actionTypeRegistry.ensureActionTypeEnabled('foo')
      ).toThrowErrorMatchingInlineSnapshot(`"Fail"`);
    });
  });

  describe('isActionExecutable()', () => {
    let actionTypeRegistry: ActionTypeRegistry;
    const fooActionType: ActionType = {
      id: 'foo',
      name: 'Foo',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      validate: {
        config: { schema: schema.object({}) },
        secrets: { schema: schema.object({}) },
        params: { schema: schema.object({}) },
      },
      executor: async (options) => {
        return { status: 'ok', actionId: options.actionId };
      },
    };

    beforeEach(() => {
      actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
      actionTypeRegistry.register(fooActionType);
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage false by default', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      actionTypeRegistry.isActionExecutable('123', 'foo');
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
        notifyUsage: false,
      });
    });

    test('should call isLicenseValidForActionType of the license state with notifyUsage true when specified', async () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      actionTypeRegistry.isActionExecutable('123', 'foo', { notifyUsage: true });
      expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalledWith(fooActionType, {
        notifyUsage: true,
      });
    });
  });

  describe('getAllTypes()', () => {
    test('should return empty when notihing is registered', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);
      const result = registry.getAllTypes();
      expect(result).toEqual([]);
    });

    test('should return list of registered type ids', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);
      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor: async (options) => {
          return { status: 'ok', actionId: options.actionId };
        },
      });
      const result = registry.getAllTypes();
      expect(result).toEqual(['foo']);
    });
  });

  describe('isSystemActionType()', () => {
    it('should return true if the action type is a system action type', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);

      registry.register({
        id: 'test.system-action',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      const result = registry.isSystemActionType('test.system-action');
      expect(result).toBe(true);
    });

    it('should return false if the action type is not a system action type', () => {
      mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });

      const registry = new ActionTypeRegistry(actionTypeRegistryParams);

      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });

      const allTypes = registry.getAllTypes();
      expect(allTypes.length).toBe(1);

      const result = registry.isSystemActionType('foo');
      expect(result).toBe(false);
    });

    it('should return false if the action type does not exists', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);

      const allTypes = registry.getAllTypes();
      expect(allTypes.length).toBe(0);

      const result = registry.isSystemActionType('not-exist');
      expect(result).toBe(false);
    });
  });

  describe('getSystemActionKibanaPrivileges()', () => {
    it('should get the kibana privileges correctly for system actions', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);

      registry.register({
        id: 'test.system-action',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges: () => ['test/create'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      const result = registry.getSystemActionKibanaPrivileges('test.system-action');
      expect(result).toEqual(['test/create']);
    });

    it('should return an empty array if the system action does not define any kibana privileges', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);

      registry.register({
        id: 'test.system-action',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      const result = registry.getSystemActionKibanaPrivileges('test.system-action');
      expect(result).toEqual([]);
    });

    it('should return an empty array if the action type is not a system action', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);

      registry.register({
        id: 'foo',
        name: 'Foo',
        minimumLicenseRequired: 'basic',
        supportedFeatureIds: ['alerting'],
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        executor,
      });

      const result = registry.getSystemActionKibanaPrivileges('foo');
      expect(result).toEqual([]);
    });

    it('should pass the params correctly', () => {
      const registry = new ActionTypeRegistry(actionTypeRegistryParams);
      const getKibanaPrivileges = jest.fn().mockReturnValue(['test/create']);

      registry.register({
        id: 'test.system-action',
        name: 'Cases',
        minimumLicenseRequired: 'platinum',
        supportedFeatureIds: ['alerting'],
        getKibanaPrivileges,
        validate: {
          config: { schema: schema.object({}) },
          secrets: { schema: schema.object({}) },
          params: { schema: schema.object({}) },
        },
        isSystemActionType: true,
        executor,
      });

      registry.getSystemActionKibanaPrivileges('test.system-action', { foo: 'bar' });
      expect(getKibanaPrivileges).toHaveBeenCalledWith({ params: { foo: 'bar' } });
    });
  });
});

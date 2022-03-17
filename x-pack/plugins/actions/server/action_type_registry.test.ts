/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskManagerMock } from '../../task_manager/server/mocks';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from './action_type_registry';
import { ActionType, ExecutorType } from './types';
import { ActionExecutor, ExecutorError, ILicenseState, TaskRunnerFactory } from './lib';
import { actionsConfigMock } from './actions_config.mock';
import { licenseStateMock } from './lib/license_state.mock';
import { ActionsConfigurationUtilities } from './actions_config';
import { licensingMock } from '../../licensing/server/mocks';
import { inMemoryMetricsMock } from './monitoring/in_memory_metrics.mock';

const mockTaskManager = taskManagerMock.createSetup();
const inMemoryMetrics = inMemoryMetricsMock.create();
let mockedLicenseState: jest.Mocked<ILicenseState>;
let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
let actionTypeRegistryParams: ActionTypeRegistryOpts;

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
    preconfiguredActions: [
      {
        actionTypeId: 'foo',
        config: {},
        id: 'my-slack1',
        name: 'Slack #xyz',
        secrets: {},
        isPreconfigured: true,
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
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'gold',
      executor,
    });
    expect(actionTypeRegistry.has('my-action-type')).toEqual(true);
    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    expect(mockTaskManager.registerTaskDefinitions.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "actions:my-action-type": Object {
            "createTaskRunner": [Function],
            "getRetry": [Function],
            "maxAttempts": 1,
            "title": "My action type",
          },
        },
      ]
    `);
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
      executor,
    });
    expect(() =>
      actionTypeRegistry.register({
        id: 'my-action-type',
        name: 'My action type',
        minimumLicenseRequired: 'basic',
        executor,
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"Action type \\"my-action-type\\" is already registered."`
    );
  });

  test('provides a getRetry function that handles ExecutorError', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    expect(mockTaskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
    const registerTaskDefinitionsCall = mockTaskManager.registerTaskDefinitions.mock.calls[0][0];
    const getRetry = registerTaskDefinitionsCall['actions:my-action-type'].getRetry!;

    const retryTime = new Date();
    expect(getRetry(0, new Error())).toEqual(false);
    expect(getRetry(0, new ExecutorError('my message', {}, true))).toEqual(true);
    expect(getRetry(0, new ExecutorError('my message', {}, false))).toEqual(false);
    expect(getRetry(0, new ExecutorError('my message', {}, undefined))).toEqual(false);
    expect(getRetry(0, new ExecutorError('my message', {}, retryTime))).toEqual(retryTime);
  });

  test('registers gold+ action types to the licensing feature usage API', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'gold',
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
      executor,
    });
    expect(actionTypeRegistryParams.licensing.featureUsage.register).not.toHaveBeenCalled();
  });
});

describe('get()', () => {
  test('returns action type', () => {
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
      executor,
    });
    const actionType = actionTypeRegistry.get('my-action-type');
    expect(actionType).toMatchInlineSnapshot(`
      Object {
        "executor": [Function],
        "id": "my-action-type",
        "minimumLicenseRequired": "basic",
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

describe('list()', () => {
  test('returns list of action types', () => {
    mockedLicenseState.isLicenseValidForActionType.mockReturnValue({ isValid: true });
    const actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register({
      id: 'my-action-type',
      name: 'My action type',
      minimumLicenseRequired: 'basic',
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
      },
    ]);
    expect(mockedActionsConfig.isActionTypeEnabled).toHaveBeenCalled();
    expect(mockedLicenseState.isLicenseValidForActionType).toHaveBeenCalled();
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
    executor: async (options) => {
      return { status: 'ok', actionId: options.actionId };
    },
  };

  beforeEach(() => {
    actionTypeRegistry = new ActionTypeRegistry(actionTypeRegistryParams);
    actionTypeRegistry.register(fooActionType);
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

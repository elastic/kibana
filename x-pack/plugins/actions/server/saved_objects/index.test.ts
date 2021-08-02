/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsServiceMock } from 'src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { ActionTypeRegistry, ActionTypeRegistryOpts } from '../action_type_registry';
import { setupSavedObjects } from './';
import { licenseStateMock } from '../lib/license_state.mock';
import { ActionExecutor, ILicenseState, TaskRunnerFactory } from '../lib';
import { licensingMock } from '../../../licensing/server/mocks';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { ActionsConfigurationUtilities } from '../actions_config';
import { actionsConfigMock } from '../actions_config.mock';

describe('index', () => {
  let mockedLicenseState: jest.Mocked<ILicenseState>;
  let actionTypeRegistryParams: ActionTypeRegistryOpts;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedLicenseState = licenseStateMock.create();
    mockedActionsConfig = actionsConfigMock.create();
    actionTypeRegistryParams = {
      licensing: licensingMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      taskRunnerFactory: new TaskRunnerFactory(new ActionExecutor({ isESOCanEncrypt: true })),
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

  it('should use single namespaceType for < 8.0', () => {
    const savedObjectsSetupContractMock = savedObjectsServiceMock.createSetupContract();
    const esoMock = encryptedSavedObjectsMock.createSetup();
    const registry = new ActionTypeRegistry(actionTypeRegistryParams);
    const taskManagerIndex = '.task_manager';
    const kibanaVersion = '7.14.0';
    setupSavedObjects(
      savedObjectsSetupContractMock,
      esoMock,
      registry,
      taskManagerIndex,
      kibanaVersion
    );

    expect(savedObjectsSetupContractMock.registerType).toHaveBeenCalledTimes(2);
    expect(savedObjectsSetupContractMock.registerType.mock.calls[0][0].namespaceType).toBe(
      'single'
    );
    expect(
      savedObjectsSetupContractMock.registerType.mock.calls[0][0].convertToMultiNamespaceTypeVersion
    ).toBeUndefined();
    expect(savedObjectsSetupContractMock.registerType.mock.calls[1][0].namespaceType).toBe(
      'single'
    );
    expect(
      savedObjectsSetupContractMock.registerType.mock.calls[1][0].convertToMultiNamespaceTypeVersion
    ).toBeUndefined();
  });

  it('should use multiple-isolated namespaceType for >= 8.0', () => {
    const savedObjectsSetupContractMock = savedObjectsServiceMock.createSetupContract();
    const esoMock = encryptedSavedObjectsMock.createSetup();
    const registry = new ActionTypeRegistry(actionTypeRegistryParams);
    const taskManagerIndex = '.task_manager';
    const kibanaVersion = '8.0.0';
    setupSavedObjects(
      savedObjectsSetupContractMock,
      esoMock,
      registry,
      taskManagerIndex,
      kibanaVersion
    );

    expect(savedObjectsSetupContractMock.registerType).toHaveBeenCalledTimes(2);
    expect(savedObjectsSetupContractMock.registerType.mock.calls[0][0].namespaceType).toBe(
      'multiple-isolated'
    );
    expect(
      savedObjectsSetupContractMock.registerType.mock.calls[0][0].convertToMultiNamespaceTypeVersion
    ).toBe('8.0.0');
    expect(savedObjectsSetupContractMock.registerType.mock.calls[1][0].namespaceType).toBe(
      'multiple-isolated'
    );
    expect(
      savedObjectsSetupContractMock.registerType.mock.calls[1][0].convertToMultiNamespaceTypeVersion
    ).toBe('8.0.0');
  });
});

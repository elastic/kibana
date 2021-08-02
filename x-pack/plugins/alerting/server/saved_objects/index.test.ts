/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { loggerMock } from '@kbn/logging/target/mocks';
import { savedObjectsServiceMock } from 'src/core/server/mocks';
import { taskManagerMock } from '../../../task_manager/server/mocks';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { RuleTypeRegistry, ConstructorOptions } from '../rule_type_registry';
import { setupSavedObjects } from './';
import { licenseStateMock } from '../lib/license_state.mock';
import { ILicenseState } from '../lib';
import { TaskRunnerFactory } from '../task_runner';
import { licensingMock } from '../../../licensing/server/mocks';

describe('index', () => {
  let mockedLicenseState: jest.Mocked<ILicenseState>;
  let ruleTypeRegistryParams: ConstructorOptions;

  const taskManager = taskManagerMock.createSetup();

  beforeEach(() => {
    jest.resetAllMocks();
    mockedLicenseState = licenseStateMock.create();
    ruleTypeRegistryParams = {
      taskManager,
      taskRunnerFactory: new TaskRunnerFactory(),
      licenseState: mockedLicenseState,
      licensing: licensingMock.createSetup(),
    };
  });

  it('should use single namespaceType for < 8.0', () => {
    const savedObjectsSetupContractMock = savedObjectsServiceMock.createSetupContract();
    const esoMock = encryptedSavedObjectsMock.createSetup();
    const logger = loggerMock.create();
    const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
    const kibanaVersion = '7.14.0';
    setupSavedObjects(savedObjectsSetupContractMock, esoMock, registry, logger, kibanaVersion);

    expect(savedObjectsSetupContractMock.registerType).toHaveBeenCalled();
    expect(savedObjectsSetupContractMock.registerType.mock.calls[0][0].namespaceType).toBe(
      'single'
    );
    expect(
      savedObjectsSetupContractMock.registerType.mock.calls[0][0].convertToMultiNamespaceTypeVersion
    ).toBeUndefined();
  });

  it('should use multiple-isolated namespaceType for >= 8.0', () => {
    const savedObjectsSetupContractMock = savedObjectsServiceMock.createSetupContract();
    const esoMock = encryptedSavedObjectsMock.createSetup();
    const logger = loggerMock.create();
    const registry = new RuleTypeRegistry(ruleTypeRegistryParams);
    const kibanaVersion = '8.0.0';
    setupSavedObjects(savedObjectsSetupContractMock, esoMock, registry, logger, kibanaVersion);

    expect(savedObjectsSetupContractMock.registerType).toHaveBeenCalledTimes(2);
    expect(savedObjectsSetupContractMock.registerType.mock.calls[0][0].namespaceType).toBe(
      'multiple-isolated'
    );
    expect(
      savedObjectsSetupContractMock.registerType.mock.calls[0][0].convertToMultiNamespaceTypeVersion
    ).toBe('8.0.0');
  });
});

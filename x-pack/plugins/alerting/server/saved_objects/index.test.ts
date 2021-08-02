/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsServiceMock } from 'src/core/server/mocks';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { ruleTypeRegistryMock } from '../rule_type_registry.mock';
import { setupSavedObjects } from './';

describe('index', () => {
  it('should use agnostic namespaceType for < 8.0', () => {
    const savedObjectsSetupContractMock = savedObjectsServiceMock.createSetupContract();
    const esoMock = encryptedSavedObjectsMock.createSetup();
    const ruleTypeRegistry = ruleTypeRegistryMock.create();
    const taskManagerIndex = '.task_manager';
    const kibanaVersion = '7.14.0';
    setupSavedObjects(
      savedObjectsSetupContractMock,
      esoMock,
      ruleTypeRegistry,
      taskManagerIndex,
      kibanaVersion
    );

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
    const ruleTypeRegistry = ruleTypeRegistryMock.create();
    const taskManagerIndex = '.task_manager';
    const kibanaVersion = '8.0.0';
    setupSavedObjects(
      savedObjectsSetupContractMock,
      esoMock,
      ruleTypeRegistry,
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
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiActionsServiceEnhancements } from './ui_actions_service_enhancements';
import { ActionFactoryDefinition, ActionFactory } from '../dynamic_actions';
import { licensingMock } from '../../../licensing/public/mocks';

const getLicenseInfo = () => licensingMock.createLicense();

describe('UiActionsService', () => {
  describe('action factories', () => {
    const factoryDefinition1: ActionFactoryDefinition = {
      id: 'test-factory-1',
      CollectConfig: {} as any,
      createConfig: () => ({}),
      isConfigValid: () => true,
      create: () => ({} as any),
      supportedTriggers() {
        return ['VALUE_CLICK_TRIGGER'];
      },
    };
    const factoryDefinition2: ActionFactoryDefinition = {
      id: 'test-factory-2',
      CollectConfig: {} as any,
      createConfig: () => ({}),
      isConfigValid: () => true,
      create: () => ({} as any),
      supportedTriggers() {
        return ['VALUE_CLICK_TRIGGER'];
      },
    };

    test('.getActionFactories() returns empty array if no action factories registered', () => {
      const service = new UiActionsServiceEnhancements({ getLicenseInfo });

      const factories = service.getActionFactories();

      expect(factories).toEqual([]);
    });

    test('can register and retrieve an action factory', () => {
      const service = new UiActionsServiceEnhancements({ getLicenseInfo });

      service.registerActionFactory(factoryDefinition1);

      const factory = service.getActionFactory(factoryDefinition1.id);

      expect(factory).toBeInstanceOf(ActionFactory);
      expect(factory.id).toBe(factoryDefinition1.id);
    });

    test('can retrieve all action factories', () => {
      const service = new UiActionsServiceEnhancements({ getLicenseInfo });

      service.registerActionFactory(factoryDefinition1);
      service.registerActionFactory(factoryDefinition2);

      const factories = service.getActionFactories();
      const factoriesSorted = [...factories].sort((f1, f2) => (f1.id > f2.id ? 1 : -1));

      expect(factoriesSorted.length).toBe(2);
      expect(factoriesSorted[0].id).toBe(factoryDefinition1.id);
      expect(factoriesSorted[1].id).toBe(factoryDefinition2.id);
    });

    test('throws when retrieving action factory that does not exist', () => {
      const service = new UiActionsServiceEnhancements({ getLicenseInfo });

      service.registerActionFactory(factoryDefinition1);

      expect(() => service.getActionFactory('UNKNOWN_ID')).toThrowError(
        'Action factory [actionFactoryId = UNKNOWN_ID] does not exist.'
      );
    });

    test('isCompatible from definition is used on registered factory', async () => {
      const service = new UiActionsServiceEnhancements({ getLicenseInfo });

      service.registerActionFactory({
        ...factoryDefinition1,
        isCompatible: () => Promise.resolve(false),
      });

      await expect(
        service.getActionFactory(factoryDefinition1.id).isCompatible({ triggers: [] })
      ).resolves.toBe(false);
    });
  });
});

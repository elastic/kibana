/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UiActionsServiceEnhancements,
  UiActionsServiceEnhancementsParams,
} from './ui_actions_service_enhancements';
import { ActionFactoryDefinition, ActionFactory } from '../dynamic_actions';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

const deps: UiActionsServiceEnhancementsParams = {
  getLicense: () => licensingMock.createLicense(),
  featureUsageSetup: licensingMock.createSetup().featureUsage,
  getFeatureUsageStart: () => licensingMock.createStart().featureUsage,
};

describe('UiActionsService', () => {
  describe('action factories', () => {
    const factoryDefinition1: ActionFactoryDefinition = {
      id: 'test-factory-1',
      CollectConfig: {},
      createConfig: () => ({}),
      isConfigValid: () => true,
      create: () => ({}),
      supportedTriggers() {
        return ['VALUE_CLICK_TRIGGER'];
      },
    } as unknown as ActionFactoryDefinition;
    const factoryDefinition2: ActionFactoryDefinition = {
      id: 'test-factory-2',
      CollectConfig: {},
      createConfig: () => ({}),
      isConfigValid: () => true,
      create: () => ({}),
      supportedTriggers() {
        return ['VALUE_CLICK_TRIGGER'];
      },
    } as unknown as ActionFactoryDefinition;

    test('.getActionFactories() returns empty array if no action factories registered', () => {
      const service = new UiActionsServiceEnhancements(deps);

      const factories = service.getActionFactories();

      expect(factories).toEqual([]);
    });

    test('can register and retrieve an action factory', () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory(factoryDefinition1);

      const factory = service.getActionFactory(factoryDefinition1.id);

      expect(factory).toBeInstanceOf(ActionFactory);
      expect(factory.id).toBe(factoryDefinition1.id);
    });

    test('can retrieve all action factories', () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory(factoryDefinition1);
      service.registerActionFactory(factoryDefinition2);

      const factories = service.getActionFactories();
      const factoriesSorted = [...factories].sort((f1, f2) => (f1.id > f2.id ? 1 : -1));

      expect(factoriesSorted.length).toBe(2);
      expect(factoriesSorted[0].id).toBe(factoryDefinition1.id);
      expect(factoriesSorted[1].id).toBe(factoryDefinition2.id);
    });

    test('throws when retrieving action factory that does not exist', () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory(factoryDefinition1);

      expect(() => service.getActionFactory('UNKNOWN_ID')).toThrowError(
        'Action factory [actionFactoryId = UNKNOWN_ID] does not exist.'
      );
    });

    test('isCompatible from definition is used on registered factory', async () => {
      const service = new UiActionsServiceEnhancements(deps);

      service.registerActionFactory({
        ...factoryDefinition1,
        isCompatible: () => Promise.resolve(false),
      });

      await expect(
        service.getActionFactory(factoryDefinition1.id).isCompatible({ triggers: [] })
      ).resolves.toBe(false);
    });

    test('action factory extract function gets called when calling uiactions extract', () => {
      const service = new UiActionsServiceEnhancements(deps);
      const actionState = {
        events: [
          {
            eventId: 'test',
            triggers: [],
            action: { factoryId: factoryDefinition1.id, name: 'test', config: {} },
          },
        ],
      };
      const extract = jest.fn().mockImplementation((state) => ({ state, references: [] }));
      service.registerActionFactory({
        ...factoryDefinition1,
        extract,
      });
      service.extract(actionState);
      expect(extract).toBeCalledWith(actionState.events[0]);
    });

    test('action factory inject function gets called when calling uiactions inject', () => {
      const service = new UiActionsServiceEnhancements(deps);
      const actionState = {
        events: [
          {
            eventId: 'test',
            triggers: [],
            action: { factoryId: factoryDefinition1.id, name: 'test', config: {} },
          },
        ],
      };
      const inject = jest.fn().mockImplementation((state) => state);
      service.registerActionFactory({
        ...factoryDefinition1,
        inject,
      });
      service.inject(actionState, []);
      expect(inject).toBeCalledWith(actionState.events[0], []);
    });

    test('action factory telemetry function gets called when calling uiactions telemetry', () => {
      const service = new UiActionsServiceEnhancements(deps);
      const actionState = {
        events: [
          {
            eventId: 'test',
            triggers: [],
            action: { factoryId: factoryDefinition1.id, name: 'test', config: {} },
          },
        ],
      };
      const telemetry = jest.fn().mockImplementation((state) => ({}));
      service.registerActionFactory({
        ...factoryDefinition1,
        telemetry,
      });
      service.telemetry(actionState);
      expect(telemetry).toBeCalledWith(actionState.events[0], {});
    });

    describe('registerFeature for licensing', () => {
      const spy = jest.spyOn(deps.featureUsageSetup, 'register');
      beforeEach(() => {
        spy.mockClear();
      });
      test('registerFeature is not called if no license requirements', () => {
        const service = new UiActionsServiceEnhancements(deps);
        service.registerActionFactory(factoryDefinition1);
        expect(spy).not.toBeCalled();
      });

      test('registerFeature is called if has license requirements', () => {
        const service = new UiActionsServiceEnhancements(deps);
        service.registerActionFactory({
          ...factoryDefinition1,
          minimalLicense: 'gold',
          licenseFeatureName: 'a name',
        });
        expect(spy).toBeCalledWith('a name', 'gold');
      });
    });
  });
});

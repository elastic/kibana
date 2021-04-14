/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionFactory, MemoryActionStorage } from '../../../dynamic_actions';
import { DrilldownManagerState, DrilldownManagerStateDeps } from './drilldown_manager_state';
import { DynamicActionManager } from '../../../dynamic_actions/dynamic_action_manager';
import { uiActionsEnhancedPluginMock } from '../../../mocks';
import { Trigger } from 'src/plugins/ui_actions/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';
import { MockedKeys } from '@kbn/utility-types/target/jest';
import { notificationServiceMock } from 'src/core/public/mocks';
import { DrilldownState } from './drilldown_state';

const createMockStore = (): MockedKeys<IStorageWrapper> => {
  let store: Record<string, any> = {};
  return {
    get: jest.fn().mockImplementation((key) => store[key]),
    set: jest.fn().mockImplementation((key, value) => (store[key] = value)),
    remove: jest.fn().mockImplementation((key: string) => delete store[key]),
    clear: jest.fn().mockImplementation(() => (store = {})),
  };
};

const createDrilldownManagerState = () => {
  const factory1 = new ActionFactory(
    {
      id: 'FACTORY1',
      CollectConfig: () => ({ render: () => {} }),
      supportedTriggers: () => ['TRIGGER1', 'TRIGGER2'],
      isConfigValid: () => true,
      createConfig: () => ({}),
      create: () => ({
        id: 'FACTOR1_ACTION',
        execute: async () => {},
      }),
    },
    {}
  );
  const factory2 = new ActionFactory(
    {
      id: 'FACTORY2',
      CollectConfig: () => ({ render: () => {} }),
      supportedTriggers: () => ['TRIGGER2', 'TRIGGER3'],
      isConfigValid: () => true,
      createConfig: () => ({}),
      create: () => ({
        id: 'FACTOR2_ACTION',
        execute: async () => {},
      }),
    },
    {}
  );
  const trigger1: Trigger = {
    id: 'TRIGGER1',
  };
  const trigger2: Trigger = {
    id: 'TRIGGER2',
  };
  const trigger3: Trigger = {
    id: 'TRIGGER3',
  };
  const uiActions = uiActionsEnhancedPluginMock.createPlugin();
  const uiActionsStart = uiActions.doStart();
  const dynamicActionManager = new DynamicActionManager({
    storage: new MemoryActionStorage(),
    isCompatible: async () => true,
    uiActions: uiActionsStart,
  });
  const storage = createMockStore();
  const toastService = notificationServiceMock.createStartContract().toasts;
  const deps: DrilldownManagerStateDeps = {
    actionFactories: [factory1, factory2],
    dynamicActionManager,
    getTrigger: (triggerId: string): Trigger => {
      if (triggerId === trigger1.id) return trigger1;
      if (triggerId === trigger2.id) return trigger2;
      if (triggerId === trigger3.id) return trigger3;
      throw new Error('Trigger not found');
    },
    onClose: () => {},
    storage,
    toastService,
    triggers: ['TRIGGER2', 'TRIGGER3'],
  };
  const state = new DrilldownManagerState(deps);

  return {
    state,
    deps,
    factory1,
    factory2,
    trigger1,
    trigger2,
    trigger3,
    uiActionsStart,
    dynamicActionManager,
    storage,
  };
};

test('can select action factory', () => {
  const { state, factory1, factory2 } = createDrilldownManagerState();
  expect(state.actionFactory$.getValue()).toBe(undefined);
  state.setActionFactory(factory1);
  expect(state.actionFactory$.getValue()!.id).toBe(factory1.id);
  state.setActionFactory(factory2);
  expect(state.actionFactory$.getValue()!.id).toBe(factory2.id);
});

test('can edit drilldown draft once action factory is selected', () => {
  const { state, factory1 } = createDrilldownManagerState();
  expect(state.getDrilldownState()).toBe(undefined);
  state.setActionFactory(factory1);
  expect(state.getDrilldownState()).toBeInstanceOf(DrilldownState);
  const drilldownState = state.getDrilldownState()!;
  expect(drilldownState.factory).toBe(factory1);
  expect(drilldownState.name$.getValue()).toBe('');
  drilldownState.setName('My name');
  expect(drilldownState.name$.getValue()).toBe('My name');
});

test('selects intersection of triggers for a drilldown', () => {
  const { state, factory1, factory2 } = createDrilldownManagerState();
  state.setActionFactory(factory1);
  expect(state.getDrilldownState()!.uiTriggers).toEqual(['TRIGGER2']);
  state.setActionFactory(factory2);
  expect(state.getDrilldownState()!.uiTriggers).toEqual(['TRIGGER2', 'TRIGGER3']);
});

test('when drilldown has only one possible trigger, that trigger is automatically selected', () => {
  const { state, factory1 } = createDrilldownManagerState();
  state.setActionFactory(factory1);
  const drilldownState = state.getDrilldownState()!;
  expect(drilldownState.uiTriggers).toEqual(['TRIGGER2']);
  expect(drilldownState.triggers$.getValue()).toEqual(['TRIGGER2']);
});

test('when drilldown has more than one possible trigger, the trigger should be selected', () => {
  const { state, factory2 } = createDrilldownManagerState();
  state.setActionFactory(factory2);
  const drilldownState = state.getDrilldownState()!;
  expect(drilldownState.uiTriggers).toEqual(['TRIGGER2', 'TRIGGER3']);
  expect(drilldownState.triggers$.getValue()).toEqual([]);
  drilldownState.setTriggers(['TRIGGER3']);
  expect(drilldownState.triggers$.getValue()).toEqual(['TRIGGER3']);
});

test('can create a drilldown', () => {});

test.todo('Can delete multiple drilldowns');

test.todo('After switching between action factories state is restored');

test.todo("Error when can't fetch drilldown list");

test.todo("Error when can't save drilldown changes");

test.todo('Should show drilldown welcome message. Should be able to dismiss it');

test.todo('Drilldown type is not shown if no supported trigger');

test.todo('Can pick a trigger');

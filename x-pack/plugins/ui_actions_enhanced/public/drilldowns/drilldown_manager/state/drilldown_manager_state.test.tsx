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
import { AdvancedUiActionsStart } from '../../..';
import { Trigger } from '@kbn/ui-actions-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { DrilldownState } from './drilldown_state';

class StorageWrapperMock implements IStorageWrapper {
  public _data = new Map<string, unknown>();

  get = (key: string) => {
    if (!this._data.has(key)) return null;
    return this._data.get(key);
  };

  set = (key: string, value: unknown) => {
    this._data.set(key, value);
  };

  remove = (key: string) => {
    this._data.delete(key);
  };

  clear = () => {};
}

const createDrilldownManagerState = () => {
  type Mutable<Type> = {
    -readonly [Property in keyof Type]: Type[Property];
  };
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
  const factory3 = new ActionFactory(
    {
      id: 'FACTORY3',
      CollectConfig: () => ({ render: () => {} }),
      supportedTriggers: () => ['TRIGGER_MISSING'],
      isConfigValid: () => true,
      createConfig: () => ({}),
      create: () => ({
        id: 'FACTOR3_ACTION',
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
  const uiActionsStartMutable = uiActionsStart as Mutable<AdvancedUiActionsStart>;
  uiActionsStartMutable.attachAction = () => {};
  uiActionsStartMutable.detachAction = () => {};
  uiActionsStartMutable.hasActionFactory = (actionFactoryId: string): boolean => {
    switch (actionFactoryId) {
      case 'FACTORY1':
      case 'FACTORY2':
      case 'FACTORY3':
        return true;
    }
    return false;
  };
  uiActionsStartMutable.getActionFactory = (actionFactoryId: string): ActionFactory => {
    switch (actionFactoryId) {
      case 'FACTORY1':
        return factory1;
      case 'FACTORY2':
        return factory2;
      case 'FACTORY3':
        return factory3;
    }
    throw new Error('Action factory not found.');
  };
  const dynamicActionManager = new DynamicActionManager({
    storage: new MemoryActionStorage(),
    isCompatible: async () => true,
    uiActions: uiActionsStart,
  });
  const storage = new StorageWrapperMock();
  const toastService = notificationServiceMock.createStartContract().toasts;
  const deps: DrilldownManagerStateDeps = {
    actionFactories: [factory1, factory2, factory3],
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
    factory3,
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

test('can change drilldown config', () => {
  const { state, factory2 } = createDrilldownManagerState();
  state.setActionFactory(factory2);
  const drilldownState = state.getDrilldownState()!;
  expect(drilldownState.config$.getValue()).toEqual({});
  drilldownState.setConfig({ foo: 'bar' });
  expect(drilldownState.config$.getValue()).toEqual({ foo: 'bar' });
});

test('can create a drilldown', async () => {
  const { state, factory2 } = createDrilldownManagerState();
  state.setActionFactory(factory2);
  const drilldownState = state.getDrilldownState()!;
  drilldownState.setName('my drill');
  drilldownState.setTriggers(['TRIGGER3']);
  drilldownState.setConfig({ foo: 'bar' });
  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(0);
  await state.createDrilldown();
  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(1);
  expect(state.deps.dynamicActionManager.state.get().events[0]).toEqual({
    eventId: expect.any(String),
    triggers: ['TRIGGER3'],
    action: {
      factoryId: 'FACTORY2',
      name: 'my drill',
      config: { foo: 'bar' },
    },
  });
});

test('can delete delete a drilldown', async () => {
  const { state, factory2 } = createDrilldownManagerState();
  state.setActionFactory(factory2);
  const drilldownState = state.getDrilldownState()!;
  drilldownState.setName('my drill');
  drilldownState.setTriggers(['TRIGGER3']);
  drilldownState.setConfig({ foo: 'bar' });
  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(0);
  await state.createDrilldown();
  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(1);
  const eventId = state.deps.dynamicActionManager.state.get().events[0].eventId;
  await state.onDelete([eventId]);
  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(0);
});

test('can delete multiple drilldowns', async () => {
  const { state, factory1, factory2 } = createDrilldownManagerState();

  state.setActionFactory(factory2);
  const drilldownState1 = state.getDrilldownState()!;
  drilldownState1.setName('my drill 1');
  drilldownState1.setTriggers(['TRIGGER3']);
  drilldownState1.setConfig({ foo: 'bar-1' });
  await state.createDrilldown();

  state.setActionFactory(factory2);
  const drilldownState2 = state.getDrilldownState()!;
  drilldownState2.setName('my drill 2');
  drilldownState2.setTriggers(['TRIGGER2']);
  drilldownState2.setConfig({ foo: 'bar-2' });
  await state.createDrilldown();

  state.setActionFactory(factory1);
  const drilldownState3 = state.getDrilldownState()!;
  drilldownState3.setName('my drill 0');
  drilldownState3.setTriggers(['TRIGGER2']);
  drilldownState3.setConfig({ foo: 'bar-3' });
  await state.createDrilldown();

  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(3);
  const id1 = state.deps.dynamicActionManager.state.get().events[0].eventId;
  const id2 = state.deps.dynamicActionManager.state.get().events[1].eventId;
  const id3 = state.deps.dynamicActionManager.state.get().events[2].eventId;
  await state.onDelete([id1, id3]);
  expect(state.deps.dynamicActionManager.state.get().events.length).toBe(1);
  expect(state.deps.dynamicActionManager.state.get().events[0]).toEqual({
    eventId: id2,
    triggers: ['TRIGGER2'],
    action: {
      factoryId: 'FACTORY2',
      name: 'my drill 2',
      config: { foo: 'bar-2' },
    },
  });
});

test('after switching between action factories state is restored', async () => {
  const { state, factory1, factory2 } = createDrilldownManagerState();

  state.setActionFactory(factory2);
  const drilldownState1 = state.getDrilldownState()!;
  drilldownState1.setName('my drill 1');
  drilldownState1.setTriggers(['TRIGGER3']);
  drilldownState1.setConfig({ foo: 'bar-1' });

  state.setActionFactory(factory1);
  const drilldownState2 = state.getDrilldownState()!;
  drilldownState2.setName('my drill 2');
  drilldownState2.setTriggers(['TRIGGER2']);
  drilldownState2.setConfig({ foo: 'bar-2' });

  state.setActionFactory(factory2);
  const drilldownState3 = state.getDrilldownState()!;
  expect(drilldownState3.name$.getValue()).toBe('my drill 1');
  expect(drilldownState3.triggers$.getValue()).toEqual(['TRIGGER3']);
  expect(drilldownState3.config$.getValue()).toEqual({ foo: 'bar-1' });
});

describe('welcome message', () => {
  test('should show welcome message by default', async () => {
    const { state } = createDrilldownManagerState();
    expect(state.hideWelcomeMessage$.getValue()).toBe(false);
  });

  test('can hide welcome message', async () => {
    const { state, storage } = createDrilldownManagerState();
    state.hideWelcomeMessage();
    expect(state.hideWelcomeMessage$.getValue()).toBe(true);
    expect(storage.get('drilldowns:hidWelcomeMessage')).toBe(true);
  });
});

test.todo('drilldown type is not shown if no supported triggers can be picked');

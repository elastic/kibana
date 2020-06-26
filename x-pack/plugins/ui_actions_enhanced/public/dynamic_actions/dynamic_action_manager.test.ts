/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DynamicActionManager } from './dynamic_action_manager';
import { ActionStorage, MemoryActionStorage } from './dynamic_action_storage';
import { UiActionsService } from '../../../../../src/plugins/ui_actions/public';
import { ActionRegistry } from '../../../../../src/plugins/ui_actions/public/types';
import { of } from '../../../../../src/plugins/kibana_utils';
import { UiActionsServiceEnhancements } from '../services';
import { ActionFactoryDefinition } from './action_factory_definition';
import { SerializedAction, SerializedEvent } from './types';
import { licensingMock } from '../../../licensing/public/mocks';

const actionFactoryDefinition1: ActionFactoryDefinition = {
  id: 'ACTION_FACTORY_1',
  CollectConfig: {} as any,
  createConfig: () => ({}),
  isConfigValid: (() => true) as any,
  create: ({ name }) => ({
    id: '',
    execute: async () => {},
    getDisplayName: () => name,
  }),
};

const actionFactoryDefinition2: ActionFactoryDefinition = {
  id: 'ACTION_FACTORY_2',
  CollectConfig: {} as any,
  createConfig: () => ({}),
  isConfigValid: (() => true) as any,
  create: ({ name }) => ({
    id: '',
    execute: async () => {},
    getDisplayName: () => name,
  }),
};

const event1: SerializedEvent = {
  eventId: 'EVENT_ID_1',
  triggers: ['VALUE_CLICK_TRIGGER'],
  action: {
    factoryId: actionFactoryDefinition1.id,
    name: 'Action 1',
    config: {},
  },
};

const event2: SerializedEvent = {
  eventId: 'EVENT_ID_2',
  triggers: ['VALUE_CLICK_TRIGGER'],
  action: {
    factoryId: actionFactoryDefinition1.id,
    name: 'Action 2',
    config: {},
  },
};

const event3: SerializedEvent = {
  eventId: 'EVENT_ID_3',
  triggers: ['VALUE_CLICK_TRIGGER'],
  action: {
    factoryId: actionFactoryDefinition2.id,
    name: 'Action 3',
    config: {},
  },
};

const setup = (
  events: readonly SerializedEvent[] = [],
  { getLicenseInfo = () => licensingMock.createLicense() } = {
    getLicenseInfo: () => licensingMock.createLicense(),
  }
) => {
  const isCompatible = async () => true;
  const storage: ActionStorage = new MemoryActionStorage(events);
  const actions: ActionRegistry = new Map();
  const uiActions = new UiActionsService({
    actions,
  });
  const uiActionsEnhancements = new UiActionsServiceEnhancements({
    getLicenseInfo,
  });
  const manager = new DynamicActionManager({
    isCompatible,
    storage,
    uiActions: { ...uiActions, ...uiActionsEnhancements },
  });

  uiActions.registerTrigger({
    id: 'VALUE_CLICK_TRIGGER',
  });

  return {
    isCompatible,
    actions,
    storage,
    uiActions: { ...uiActions, ...uiActionsEnhancements },
    manager,
  };
};

describe('DynamicActionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('can instantiate', () => {
    const { manager } = setup([event1]);
    expect(manager).toBeInstanceOf(DynamicActionManager);
  });

  describe('.start()', () => {
    test('instantiates stored events', async () => {
      const { manager, actions, uiActions } = setup([event1]);
      const create1 = jest.spyOn(actionFactoryDefinition1, 'create');
      const create2 = jest.spyOn(actionFactoryDefinition2, 'create');

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      expect(create1).toHaveBeenCalledTimes(0);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(actions.size).toBe(0);

      await manager.start();

      expect(create1).toHaveBeenCalledTimes(1);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(actions.size).toBe(1);
    });

    test('does nothing when no events stored', async () => {
      const { manager, actions, uiActions } = setup();
      const create1 = jest.spyOn(actionFactoryDefinition1, 'create');
      const create2 = jest.spyOn(actionFactoryDefinition2, 'create');

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      expect(create1).toHaveBeenCalledTimes(0);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(actions.size).toBe(0);

      await manager.start();

      expect(create1).toHaveBeenCalledTimes(0);
      expect(create2).toHaveBeenCalledTimes(0);
      expect(actions.size).toBe(0);
    });

    test('UI state is empty before manager starts', async () => {
      const { manager } = setup([event1]);

      expect(manager.state.get()).toMatchObject({
        events: [],
        isFetchingEvents: false,
        fetchCount: 0,
      });
    });

    test('loads events into UI state', async () => {
      const { manager, uiActions } = setup([event1, event2, event3]);

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      await manager.start();

      expect(manager.state.get()).toMatchObject({
        events: [event1, event2, event3],
        isFetchingEvents: false,
        fetchCount: 1,
      });
    });

    test('sets isFetchingEvents to true while fetching events', async () => {
      const { manager, uiActions } = setup([event1, event2, event3]);

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      const promise = manager.start().catch(() => {});

      expect(manager.state.get().isFetchingEvents).toBe(true);

      await promise;

      expect(manager.state.get().isFetchingEvents).toBe(false);
    });

    test('throws if storage threw', async () => {
      const { manager, storage } = setup([event1]);

      storage.list = async () => {
        throw new Error('baz');
      };

      const [, error] = await of(manager.start());

      expect(error).toEqual(new Error('baz'));
    });

    test('sets UI state error if error happened during initial fetch', async () => {
      const { manager, storage } = setup([event1]);

      storage.list = async () => {
        throw new Error('baz');
      };

      await of(manager.start());

      expect(manager.state.get().fetchError!.message).toBe('baz');
    });
  });

  describe('.stop()', () => {
    test('removes events from UI actions registry', async () => {
      const { manager, actions, uiActions } = setup([event1, event2]);

      uiActions.registerActionFactory(actionFactoryDefinition1);
      uiActions.registerActionFactory(actionFactoryDefinition2);

      expect(actions.size).toBe(0);

      await manager.start();

      expect(actions.size).toBe(2);

      await manager.stop();

      expect(actions.size).toBe(0);
    });
  });

  describe('.createEvent()', () => {
    describe('when storage succeeds', () => {
      test('stores new event in storage', async () => {
        const { manager, storage, uiActions } = setup([]);

        uiActions.registerActionFactory(actionFactoryDefinition1);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        expect(await storage.count()).toBe(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);

        expect(await storage.count()).toBe(1);

        const [event] = await storage.list();

        expect(event).toMatchObject({
          eventId: expect.any(String),
          triggers: ['VALUE_CLICK_TRIGGER'],
          action: {
            factoryId: actionFactoryDefinition1.id,
            name: 'foo',
            config: {},
          },
        });
      });

      test('adds event to UI state', async () => {
        const { manager, uiActions } = setup([]);
        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);

        expect(manager.state.get().events.length).toBe(1);
      });

      test('optimistically adds event to UI state', async () => {
        const { manager, uiActions } = setup([]);
        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        const promise = manager.createEvent(action, ['VALUE_CLICK_TRIGGER']).catch((e) => e);

        expect(manager.state.get().events.length).toBe(1);

        await promise;

        expect(manager.state.get().events.length).toBe(1);
      });

      test('instantiates event in actions service', async () => {
        const { manager, uiActions, actions } = setup([]);
        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(actions.size).toBe(0);

        await manager.createEvent(action, ['VALUE_CLICK_TRIGGER']);

        expect(actions.size).toBe(1);
      });
    });

    describe('when storage fails', () => {
      test('throws an error', async () => {
        const { manager, storage, uiActions } = setup([]);

        storage.create = async () => {
          throw new Error('foo');
        };

        uiActions.registerActionFactory(actionFactoryDefinition1);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        const [, error] = await of(manager.createEvent(action, ['VALUE_CLICK_TRIGGER']));

        expect(error).toEqual(new Error('foo'));
      });

      test('does not add even to UI state', async () => {
        const { manager, storage, uiActions } = setup([]);
        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        storage.create = async () => {
          throw new Error('foo');
        };
        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();
        await of(manager.createEvent(action, ['VALUE_CLICK_TRIGGER']));

        expect(manager.state.get().events.length).toBe(0);
      });

      test('optimistically adds event to UI state and then removes it', async () => {
        const { manager, storage, uiActions } = setup([]);
        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        storage.create = async () => {
          throw new Error('foo');
        };
        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events.length).toBe(0);

        const promise = manager.createEvent(action, ['VALUE_CLICK_TRIGGER']).catch((e) => e);

        expect(manager.state.get().events.length).toBe(1);

        await promise;

        expect(manager.state.get().events.length).toBe(0);
      });

      test('does not instantiate event in actions service', async () => {
        const { manager, storage, uiActions, actions } = setup([]);
        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition1.id,
          name: 'foo',
          config: {},
        };

        storage.create = async () => {
          throw new Error('foo');
        };
        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(actions.size).toBe(0);

        await of(manager.createEvent(action, ['VALUE_CLICK_TRIGGER']));

        expect(actions.size).toBe(0);
      });
    });
  });

  describe('.updateEvent()', () => {
    describe('when storage succeeds', () => {
      test('un-registers old event from ui actions service and registers the new one', async () => {
        const { manager, actions, uiActions } = setup([event3]);

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        expect(actions.size).toBe(1);

        const registeredAction1 = actions.values().next().value;

        expect(registeredAction1.getDisplayName()).toBe('Action 3');

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        await manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']);

        expect(actions.size).toBe(1);

        const registeredAction2 = actions.values().next().value;

        expect(registeredAction2.getDisplayName()).toBe('foo');
      });

      test('updates event in storage', async () => {
        const { manager, storage, uiActions } = setup([event3]);
        const storageUpdateSpy = jest.spyOn(storage, 'update');

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(storageUpdateSpy).toHaveBeenCalledTimes(0);

        await manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']);

        expect(storageUpdateSpy).toHaveBeenCalledTimes(1);
        expect(storageUpdateSpy.mock.calls[0][0]).toMatchObject({
          eventId: expect.any(String),
          triggers: ['VALUE_CLICK_TRIGGER'],
          action: {
            factoryId: actionFactoryDefinition2.id,
          },
        });
      });

      test('updates event in UI state', async () => {
        const { manager, uiActions } = setup([event3]);

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(manager.state.get().events[0].action.name).toBe('Action 3');

        await manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']);

        expect(manager.state.get().events[0].action.name).toBe('foo');
      });

      test('optimistically updates event in UI state', async () => {
        const { manager, uiActions } = setup([event3]);

        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(manager.state.get().events[0].action.name).toBe('Action 3');

        const promise = manager
          .updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER'])
          .catch((e) => e);

        expect(manager.state.get().events[0].action.name).toBe('foo');

        await promise;
      });
    });

    describe('when storage fails', () => {
      test('throws error', async () => {
        const { manager, storage, uiActions } = setup([event3]);

        storage.update = () => {
          throw new Error('bar');
        };
        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        const [, error] = await of(
          manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER'])
        );

        expect(error).toEqual(new Error('bar'));
      });

      test('keeps the old action in actions registry', async () => {
        const { manager, storage, actions, uiActions } = setup([event3]);

        storage.update = () => {
          throw new Error('bar');
        };
        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        expect(actions.size).toBe(1);

        const registeredAction1 = actions.values().next().value;

        expect(registeredAction1.getDisplayName()).toBe('Action 3');

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        await of(manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']));

        expect(actions.size).toBe(1);

        const registeredAction2 = actions.values().next().value;

        expect(registeredAction2.getDisplayName()).toBe('Action 3');
      });

      test('keeps old event in UI state', async () => {
        const { manager, storage, uiActions } = setup([event3]);

        storage.update = () => {
          throw new Error('bar');
        };
        uiActions.registerActionFactory(actionFactoryDefinition2);
        await manager.start();

        const action: SerializedAction<unknown> = {
          factoryId: actionFactoryDefinition2.id,
          name: 'foo',
          config: {},
        };

        expect(manager.state.get().events[0].action.name).toBe('Action 3');

        await of(manager.updateEvent(event3.eventId, action, ['VALUE_CLICK_TRIGGER']));

        expect(manager.state.get().events[0].action.name).toBe('Action 3');
      });
    });
  });

  describe('.deleteEvents()', () => {
    describe('when storage succeeds', () => {
      test('removes all actions from uiActions service', async () => {
        const { manager, actions, uiActions } = setup([event2, event1]);

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(actions.size).toBe(2);

        await manager.deleteEvents([event1.eventId, event2.eventId]);

        expect(actions.size).toBe(0);
      });

      test('removes all events from storage', async () => {
        const { manager, uiActions, storage } = setup([event2, event1]);

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(await storage.list()).toEqual([event2, event1]);

        await manager.deleteEvents([event1.eventId, event2.eventId]);

        expect(await storage.list()).toEqual([]);
      });

      test('removes all events from UI state', async () => {
        const { manager, uiActions } = setup([event2, event1]);

        uiActions.registerActionFactory(actionFactoryDefinition1);

        await manager.start();

        expect(manager.state.get().events).toEqual([event2, event1]);

        await manager.deleteEvents([event1.eventId, event2.eventId]);

        expect(manager.state.get().events).toEqual([]);
      });
    });
  });

  test('revived actions incompatible when license is not enough', async () => {
    const getLicenseInfo = jest.fn(() =>
      licensingMock.createLicense({ license: { type: 'basic' } })
    );
    const { manager, uiActions } = setup([event1, event3], { getLicenseInfo });
    const basicActionFactory: ActionFactoryDefinition = {
      ...actionFactoryDefinition1,
      minimalLicense: 'basic',
    };

    const goldActionFactory: ActionFactoryDefinition = {
      ...actionFactoryDefinition2,
      minimalLicense: 'gold',
    };

    uiActions.registerActionFactory(basicActionFactory);
    uiActions.registerActionFactory(goldActionFactory);

    await manager.start();

    const basicActions = await uiActions.getTriggerCompatibleActions(
      'VALUE_CLICK_TRIGGER',
      {} as any
    );
    expect(basicActions).toHaveLength(1);

    getLicenseInfo.mockImplementation(() =>
      licensingMock.createLicense({ license: { type: 'gold' } })
    );

    const basicAndGoldActions = await uiActions.getTriggerCompatibleActions(
      'VALUE_CLICK_TRIGGER',
      {} as any
    );

    expect(basicAndGoldActions).toHaveLength(2);
  });
});

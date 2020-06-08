/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Embeddable, ViewMode } from '../../../../../src/plugins/embeddable/public';
import {
  EmbeddableActionStorage,
  EmbeddableWithDynamicActionsInput,
} from './embeddable_action_storage';
import { UiActionsEnhancedSerializedEvent } from '../../../ui_actions_enhanced/public';
import { of } from '../../../../../src/plugins/kibana_utils/public';

class TestEmbeddable extends Embeddable<EmbeddableWithDynamicActionsInput> {
  public readonly type = 'test';
  constructor() {
    super({ id: 'test', viewMode: ViewMode.VIEW }, {});
  }
  reload() {}
}

describe('EmbeddableActionStorage', () => {
  describe('.create()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.create).toBe('function');
    });

    test('can add event to embeddable', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      const events1 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events1).toEqual([]);

      await storage.create(event);

      const events2 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events2).toEqual([event]);
    });

    test('does not merge .getInput() into .updateInput()', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      const spy = jest.spyOn(embeddable, 'updateInput');

      await storage.create(event);

      expect(spy.mock.calls[0][0].id).toBe(undefined);
      expect(spy.mock.calls[0][0].viewMode).toBe(undefined);
    });

    test('can create multiple events', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      const events1 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events1).toEqual([]);

      await storage.create(event1);

      const events2 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events2).toEqual([event1]);

      await storage.create(event2);
      await storage.create(event3);

      const events3 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events3).toEqual([event1, event2, event3]);
    });

    test('throws when creating an event with the same ID', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event);
      const [, error] = await of(storage.create(event));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[EEXIST]: Event with [eventId = EVENT_ID] already exists on [embeddable.id = test, embeddable.title = undefined]."`
      );
    });
  });

  describe('.update()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.update).toBe('function');
    });

    test('can update an existing event', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'foo',
        } as any,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'bar',
        } as any,
      };

      await storage.create(event1);
      await storage.update(event2);

      const events = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events).toEqual([event2]);
    });

    test('updates event in place of the old event', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'foo',
        } as any,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'bar',
        } as any,
      };
      const event22: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'baz',
        } as any,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'qux',
        } as any,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const events1 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events1).toEqual([event1, event2, event3]);

      await storage.update(event22);

      const events2 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events2).toEqual([event1, event22, event3]);

      await storage.update(event2);

      const events3 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events3).toEqual([event1, event2, event3]);
    });

    test('throws when updating event, but storage is empty', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      const [, error] = await of(storage.update(event));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be updated as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });

    test('throws when updating event with ID that is not stored', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event1);
      const [, error] = await of(storage.update(event2));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID2] could not be updated as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });
  });

  describe('.remove()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.remove).toBe('function');
    });

    test('can remove existing event', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event);
      await storage.remove(event.eventId);

      const events = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events).toEqual([]);
    });

    test('removes correct events in a list of events', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'foo',
        } as any,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'bar',
        } as any,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {
          name: 'qux',
        } as any,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const events1 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events1).toEqual([event1, event2, event3]);

      await storage.remove(event2.eventId);

      const events2 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events2).toEqual([event1, event3]);

      await storage.remove(event3.eventId);

      const events3 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events3).toEqual([event1]);

      await storage.remove(event1.eventId);

      const events4 = embeddable.getInput().enhancements?.dynamicActions?.events || [];
      expect(events4).toEqual([]);
    });

    test('throws when removing an event from an empty storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const [, error] = await of(storage.remove('EVENT_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be removed as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });

    test('throws when removing with ID that does not exist in storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event);
      const [, error] = await of(storage.remove('WRONG_ID'));
      await storage.remove(event.eventId);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = WRONG_ID] could not be removed as it does not exist in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });
  });

  describe('.read()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.read).toBe('function');
    });

    test('can read an existing event out of storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event);
      const event2 = await storage.read(event.eventId);

      expect(event2).toEqual(event);
    });

    test('throws when reading from empty storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const [, error] = await of(storage.read('EVENT_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = EVENT_ID] could not be found in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });

    test('throws when reading event with ID not existing in storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event);
      const [, error] = await of(storage.read('WRONG_ID'));

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toMatchInlineSnapshot(
        `"[ENOENT]: Event with [eventId = WRONG_ID] could not be found in [embeddable.id = test, embeddable.title = undefined]."`
      );
    });

    test('returns correct event when multiple events are stored', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };
      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };
      const event3: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID3',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      await storage.create(event1);
      await storage.create(event2);
      await storage.create(event3);

      const event12 = await storage.read(event1.eventId);
      const event22 = await storage.read(event2.eventId);
      const event32 = await storage.read(event3.eventId);

      expect(event12).toEqual(event1);
      expect(event22).toEqual(event2);
      expect(event32).toEqual(event3);

      expect(event12).not.toEqual(event2);
    });
  });

  describe('.count()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.count).toBe('function');
    });

    test('returns 0 when storage is empty', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const count = await storage.count();

      expect(count).toBe(0);
    });

    test('returns correct number of events in storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      expect(await storage.count()).toBe(0);

      await storage.create({
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      });

      expect(await storage.count()).toBe(1);

      await storage.create({
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      });

      expect(await storage.count()).toBe(2);

      await storage.remove('EVENT_ID1');

      expect(await storage.count()).toBe(1);

      await storage.remove('EVENT_ID2');

      expect(await storage.count()).toBe(0);
    });
  });

  describe('.list()', () => {
    test('method exists', () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);
      expect(typeof storage.list).toBe('function');
    });

    test('returns empty array when storage is empty', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const list = await storage.list();

      expect(list).toEqual([]);
    });

    test('returns correct list of events in storage', async () => {
      const embeddable = new TestEmbeddable();
      const storage = new EmbeddableActionStorage(embeddable);

      const event1: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID1',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      const event2: UiActionsEnhancedSerializedEvent = {
        eventId: 'EVENT_ID2',
        triggers: ['TRIGGER-ID'],
        action: {} as any,
      };

      expect(await storage.list()).toEqual([]);

      await storage.create(event1);

      expect(await storage.list()).toEqual([event1]);

      await storage.create(event2);

      expect(await storage.list()).toEqual([event1, event2]);

      await storage.remove('EVENT_ID1');

      expect(await storage.list()).toEqual([event2]);

      await storage.remove('EVENT_ID2');

      expect(await storage.list()).toEqual([]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EmbeddableApiContext, PublishesWritableViewMode } from '@kbn/presentation-publishing';
import {
  DynamicActionManager,
  SerializedEvent,
} from '@kbn/ui-actions-enhanced-plugin/public/dynamic_actions';
import { BehaviorSubject } from 'rxjs';
import { DynamicActionsSerializedState } from '../plugin';
import {
  PanelNotificationsAction,
  PanelNotificationsActionApi,
} from './panel_notifications_action';

const createContext = (events: SerializedEvent[] = []): EmbeddableApiContext => {
  const dynamicActionsState$ = new BehaviorSubject<DynamicActionsSerializedState['enhancements']>({
    dynamicActions: { events },
  });
  const viewMode$ = new BehaviorSubject<ViewMode>(ViewMode.VIEW);

  return {
    embeddable: {
      enhancements: {
        dynamicActions: {} as unknown as DynamicActionManager,
      },
      setDynamicActions: (value: DynamicActionsSerializedState['enhancements']) => {
        dynamicActionsState$.next(value);
      },
      dynamicActionsState$,
      viewMode: viewMode$,
      setViewMode: (value: ViewMode) => viewMode$.next(value),
    } as PanelNotificationsActionApi & PublishesWritableViewMode,
  } as EmbeddableApiContext;
};

describe('PanelNotificationsAction', () => {
  describe('getDisplayName', () => {
    test('returns "0" if embeddable has no events', async () => {
      const context = createContext();
      const action = new PanelNotificationsAction();

      const name = action.getDisplayName(context);
      expect(name).toBe('0');
    });

    test('returns "2" if embeddable has two events', async () => {
      const context = createContext([{}, {}] as SerializedEvent[]);
      const action = new PanelNotificationsAction();

      const name = action.getDisplayName(context);
      expect(name).toBe('2');
    });

    test('updates display name when dynamic actions is updated', async () => {
      const context = createContext([{}, {}] as SerializedEvent[]);
      const action = new PanelNotificationsAction();

      (context.embeddable as PanelNotificationsActionApi).setDynamicActions({
        dynamicActions: { events: [{}, {}, {}] as SerializedEvent[] },
      });

      const name = action.getDisplayName(context);
      expect(name).toBe('3');
    });
  });

  describe('getDisplayNameTooltip', () => {
    test('returns empty string if embeddable has no event', async () => {
      const context = createContext();
      const action = new PanelNotificationsAction();

      const name = action.getDisplayNameTooltip(context);
      expect(name).toBe('');
    });

    test('returns "1 drilldown" if embeddable has one event', async () => {
      const context = createContext([{} as SerializedEvent]);
      const action = new PanelNotificationsAction();

      const name = action.getDisplayNameTooltip(context);
      expect(name).toBe('Panel has 1 drilldown');
    });

    test('returns "2 drilldowns" if embeddable has two events', async () => {
      const context = createContext([{}, {}] as SerializedEvent[]);
      const action = new PanelNotificationsAction();

      const name = action.getDisplayNameTooltip(context);
      expect(name).toBe('Panel has 2 drilldowns');
    });

    test('returns "3 drilldowns" if embeddable has three events', async () => {
      const context = createContext([{}, {}, {}] as SerializedEvent[]);
      const action = new PanelNotificationsAction();

      const name = action.getDisplayNameTooltip(context);
      expect(name).toBe('Panel has 3 drilldowns');
    });

    test('updates tooltip when dynamic actions is updated', async () => {
      const context = createContext([{}, {}, {}] as SerializedEvent[]);
      const action = new PanelNotificationsAction();

      (context.embeddable as PanelNotificationsActionApi).setDynamicActions({
        dynamicActions: { events: [{}, {}] as SerializedEvent[] },
      });

      const name = action.getDisplayNameTooltip(context);
      expect(name).toBe('Panel has 2 drilldowns');
    });
  });

  describe('isCompatible', () => {
    test('returns false if not in "edit" mode', async () => {
      const context = createContext([{} as SerializedEvent]);
      const action = new PanelNotificationsAction();

      const result = await action.isCompatible(context);
      expect(result).toBe(false);
    });

    test('returns true when switching to "edit" mode', async () => {
      const context = createContext([{} as SerializedEvent]);

      const action = new PanelNotificationsAction();
      (context.embeddable as PublishesWritableViewMode).setViewMode(ViewMode.EDIT);
      const result = await action.isCompatible(context);
      expect(result).toBe(true);
    });

    test('returns false when in edit mode but embeddable has no events', async () => {
      const context = createContext([]);
      (context.embeddable as PublishesWritableViewMode).setViewMode(ViewMode.EDIT);

      const action = new PanelNotificationsAction();

      const result = await action.isCompatible(context);
      expect(result).toBe(false);
    });
  });
});

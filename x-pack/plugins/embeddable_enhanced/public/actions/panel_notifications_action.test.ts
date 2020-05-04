/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PanelNotificationsAction } from './panel_notifications_action';
import { EnhancedEmbeddableContext } from '../types';
import { ViewMode } from '../../../../../src/plugins/embeddable/public';

const createContext = (events: unknown[] = [], isEditMode = false): EnhancedEmbeddableContext =>
  ({
    embeddable: {
      getInput: () =>
        ({
          viewMode: isEditMode ? ViewMode.EDIT : ViewMode.VIEW,
        } as unknown),
      enhancements: {
        dynamicActions: {
          state: {
            get: () =>
              ({
                events,
              } as unknown),
          },
        },
      },
    },
  } as EnhancedEmbeddableContext);

describe('PanelNotificationsAction', () => {
  describe('getDisplayName', () => {
    test('returns "0" if embeddable has no events', async () => {
      const context = createContext();
      const action = new PanelNotificationsAction();

      const name = await action.getDisplayName(context);
      expect(name).toBe('0');
    });

    test('returns "2" if embeddable has two events', async () => {
      const context = createContext([{}, {}]);
      const action = new PanelNotificationsAction();

      const name = await action.getDisplayName(context);
      expect(name).toBe('2');
    });
  });

  describe('isCompatible', () => {
    test('returns false if not in "edit" mode', async () => {
      const context = createContext([{}]);
      const action = new PanelNotificationsAction();

      const result = await action.isCompatible(context);
      expect(result).toBe(false);
    });

    test('returns true when in "edit" mode', async () => {
      const context = createContext([{}], true);
      const action = new PanelNotificationsAction();

      const result = await action.isCompatible(context);
      expect(result).toBe(true);
    });

    test('returns false when no embeddable has no events', async () => {
      const context = createContext([], true);
      const action = new PanelNotificationsAction();

      const result = await action.isCompatible(context);
      expect(result).toBe(false);
    });
  });
});

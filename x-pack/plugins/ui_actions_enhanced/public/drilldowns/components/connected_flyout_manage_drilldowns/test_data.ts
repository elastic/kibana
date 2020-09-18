/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  UiActionsEnhancedDynamicActionManagerState as DynamicActionManagerState,
  UiActionsEnhancedSerializedAction,
} from '../../../index';
import { TriggerContextMapping } from '../../../../../../../src/plugins/ui_actions/public';
import { createStateContainer } from '../../../../../../../src/plugins/kibana_utils/common';

class MockDynamicActionManager implements PublicMethodsOf<DynamicActionManager> {
  public readonly state = createStateContainer<DynamicActionManagerState>({
    isFetchingEvents: false,
    fetchCount: 0,
    events: [],
  });

  async count() {
    return this.state.get().events.length;
  }

  async list() {
    return this.state.get().events;
  }

  async createEvent(
    action: UiActionsEnhancedSerializedAction<any>,
    triggers: Array<keyof TriggerContextMapping>
  ) {
    const event = {
      action,
      triggers,
      eventId: uuid(),
    };
    const state = this.state.get();
    this.state.set({
      ...state,
      events: [...state.events, event],
    });
  }

  async deleteEvents(eventIds: string[]) {
    const state = this.state.get();
    let events = state.events;

    eventIds.forEach((id) => {
      events = events.filter((e) => e.eventId !== id);
    });

    this.state.set({
      ...state,
      events,
    });
  }

  async updateEvent(
    eventId: string,
    action: UiActionsEnhancedSerializedAction<unknown>,
    triggers: Array<keyof TriggerContextMapping>
  ) {
    const state = this.state.get();
    const events = state.events;
    const idx = events.findIndex((e) => e.eventId === eventId);
    const event = {
      eventId,
      action,
      triggers,
    };

    this.state.set({
      ...state,
      events: [...events.slice(0, idx), event, ...events.slice(idx + 1)],
    });
  }

  async deleteEvent() {
    throw new Error('not implemented');
  }

  async start() {}
  async stop() {}
}

export const mockDynamicActionManager = (new MockDynamicActionManager() as unknown) as DynamicActionManager;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  UiActionsEnhancedDynamicActionManager as DynamicActionManager,
  UiActionsEnhancedDynamicActionManagerState as DynamicActionManagerState,
  UiActionsEnhancedSerializedAction,
} from '../../../index';
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

  async createEvent(action: UiActionsEnhancedSerializedAction<any>, triggers: string[]) {
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
    action: UiActionsEnhancedSerializedAction,
    triggers: string[]
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

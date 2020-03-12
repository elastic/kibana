/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import {
  DynamicActionManager,
  UiActionsSerializedAction,
  UiActionsSerializedEvent,
} from '../../../../../../src/plugins/ui_actions/public';

class MockDynamicActionManager implements PublicMethodsOf<DynamicActionManager> {
  private readonly events: UiActionsSerializedEvent[] = [];

  async count() {
    return this.events.length;
  }
  async list() {
    return this.events;
  }
  async createEvent(
    action: UiActionsSerializedAction<any>,
    triggerId: string = 'VALUE_CLICK_TRIGGER'
  ) {
    this.events.push({
      action,
      triggerId,
      eventId: uuid(),
    });
  }
  async deleteEvents(eventIds: string[]) {
    eventIds.forEach(id => {
      const idx = this.events.findIndex(e => e.eventId === id);
      this.events.splice(idx, 1);
    });
  }
  async updateEvent(
    eventId: string,
    action: UiActionsSerializedAction<unknown>,
    triggerId: string = 'VALUE_CLICK_TRIGGER'
  ) {
    const idx = this.events.findIndex(e => e.eventId === eventId);
    this.events[idx] = {
      eventId,
      action,
      triggerId,
    };
  }

  async start() {}
  async stop() {}
}

export const mockDynamicActionManager = (new MockDynamicActionManager() as unknown) as DynamicActionManager;

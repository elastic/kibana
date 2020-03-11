/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DynamicActionManager,
  UiActionsSerializedAction,
} from '../../../../../../src/plugins/ui_actions/public';

class MockDynamicActionManager implements PublicMethodsOf<DynamicActionManager> {
  async count() {
    return 0;
  }
  async createEvent(action: UiActionsSerializedAction<any>, triggerId?: string) {}
  async deleteEvents(eventIds: string[]) {}
  async list() {
    return [];
  }
  async updateEvent(
    eventId: string,
    action: UiActionsSerializedAction<unknown>,
    triggerId?: string
  ) {}

  async start() {}
  async stop() {}
}

export const mockDynamicActionManager = (new MockDynamicActionManager() as unknown) as DynamicActionManager;

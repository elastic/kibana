/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiActionsEnhancedAbstractActionStorage as AbstractActionStorage,
  UiActionsEnhancedSerializedEvent as SerializedEvent,
} from '../../../advanced_ui_actions/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';

export class EmbeddableActionStorage extends AbstractActionStorage {
  constructor(private readonly embbeddable: IEmbeddable) {
    super();
  }

  async create(event: SerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const exists = !!events.find(({ eventId }) => eventId === event.eventId);

    if (exists) {
      throw new Error(
        `[EEXIST]: Event with [eventId = ${event.eventId}] already exists on ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      events: [...events, event],
    });
  }

  async update(event: SerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const index = events.findIndex(({ eventId }) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${event.eventId}] could not be ` +
          `updated as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      events: [...events.slice(0, index), event, ...events.slice(index + 1)],
    });
  }

  async remove(eventId: string) {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const index = events.findIndex(event => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be ` +
          `removed as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.embbeddable.updateInput({
      events: [...events.slice(0, index), ...events.slice(index + 1)],
    });
  }

  async read(eventId: string): Promise<SerializedEvent> {
    const input = this.embbeddable.getInput();
    const events = (input.events || []) as SerializedEvent[];
    const event = events.find(ev => eventId === ev.eventId);

    if (!event) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be found in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    return event;
  }

  private __list() {
    const input = this.embbeddable.getInput();
    return (input.events || []) as SerializedEvent[];
  }

  async list(): Promise<SerializedEvent[]> {
    return this.__list();
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  UiActionsEnhancedAbstractActionStorage as AbstractActionStorage,
  UiActionsEnhancedSerializedEvent as SerializedEvent,
} from '../../../ui_actions_enhanced/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../src/plugins/embeddable/public';

export interface EmbeddableWithDynamicActionsInput extends EmbeddableInput {
  enhancements?: {
    dynamicActions?: {
      events: SerializedEvent[];
    };
  };
}

export type EmbeddableWithDynamicActions<
  I extends EmbeddableWithDynamicActionsInput = EmbeddableWithDynamicActionsInput,
  O extends EmbeddableOutput = EmbeddableOutput
> = IEmbeddable<I, O>;

export class EmbeddableActionStorage extends AbstractActionStorage {
  constructor(private readonly embbeddable: EmbeddableWithDynamicActions) {
    super();
  }

  private put(input: EmbeddableWithDynamicActionsInput, events: SerializedEvent[]) {
    this.embbeddable.updateInput({
      enhancements: {
        ...(input.enhancements || {}),
        dynamicActions: {
          ...(input.enhancements?.dynamicActions || {}),
          events,
        },
      },
    });
  }

  public async create(event: SerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = input.enhancements?.dynamicActions?.events || [];
    const exists = !!events.find(({ eventId }) => eventId === event.eventId);

    if (exists) {
      throw new Error(
        `[EEXIST]: Event with [eventId = ${event.eventId}] already exists on ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.put(input, [...events, event]);
  }

  public async update(event: SerializedEvent) {
    const input = this.embbeddable.getInput();
    const events = input.enhancements?.dynamicActions?.events || [];
    const index = events.findIndex(({ eventId }) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${event.eventId}] could not be ` +
          `updated as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.put(input, [...events.slice(0, index), event, ...events.slice(index + 1)]);
  }

  public async remove(eventId: string) {
    const input = this.embbeddable.getInput();
    const events = input.enhancements?.dynamicActions?.events || [];
    const index = events.findIndex((event) => eventId === event.eventId);

    if (index === -1) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be ` +
          `removed as it does not exist in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    this.put(input, [...events.slice(0, index), ...events.slice(index + 1)]);
  }

  public async read(eventId: string): Promise<SerializedEvent> {
    const input = this.embbeddable.getInput();
    const events = input.enhancements?.dynamicActions?.events || [];
    const event = events.find((ev) => eventId === ev.eventId);

    if (!event) {
      throw new Error(
        `[ENOENT]: Event with [eventId = ${eventId}] could not be found in ` +
          `[embeddable.id = ${input.id}, embeddable.title = ${input.title}].`
      );
    }

    return event;
  }

  public async list(): Promise<SerializedEvent[]> {
    const input = this.embbeddable.getInput();
    const events = input.enhancements?.dynamicActions?.events || [];
    return events;
  }
}

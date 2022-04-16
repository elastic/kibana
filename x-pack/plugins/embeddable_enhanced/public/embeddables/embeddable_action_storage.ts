/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import {
  DynamicActionsState,
  UiActionsEnhancedAbstractActionStorage as AbstractActionStorage,
  UiActionsEnhancedSerializedEvent as SerializedEvent,
} from '@kbn/ui-actions-enhanced-plugin/public';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from '@kbn/embeddable-plugin/public';

export interface EmbeddableWithDynamicActionsInput extends EmbeddableInput {
  enhancements?: {
    dynamicActions: DynamicActionsState;
    [key: string]: SerializableRecord;
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
    const events = this.getEventsFromEmbeddable();
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
    const events = this.getEventsFromEmbeddable();
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
    const events = this.getEventsFromEmbeddable();
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
    const events = this.getEventsFromEmbeddable();
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
    return this.getEventsFromEmbeddable();
  }

  private getEventsFromEmbeddable() {
    const input = this.embbeddable.getInput();
    const events = input.enhancements?.dynamicActions?.events || [];
    return this.migrate(events);
  }

  // TODO: https://github.com/elastic/kibana/issues/71431
  // Migration implementation should use registry
  // Action factories implementations should register own migrations
  private migrate(events: SerializedEvent[]): SerializedEvent[] {
    return events.map((event) => {
      // Initially dashboard drilldown relied on VALUE_CLICK & RANGE_SELECT
      if (event.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN') {
        return {
          ...event,
          triggers: ['FILTER_TRIGGER'],
        };
      }
      return event;
    });
  }
}

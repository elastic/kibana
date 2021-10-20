/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from './types';

export const TELEMETRY_MAX_BUFFER_SIZE = 100;

export class TelemetryQueue {
  private maxQueueSize = TELEMETRY_MAX_BUFFER_SIZE;
  private queue: TelemetryEvent[] = [];

  public addEvents(events: TelemetryEvent[]) {
    const qlength = this.queue.length;

    if (events.length === 0) {
      return;
    }

    // do not add events with same id
    events = events.filter(
      (event) => !this.queue.find((qItem) => qItem.id && event.id && qItem.id === event.id)
    );

    if (qlength >= this.maxQueueSize) {
      // we're full already
      return;
    }

    if (events.length > this.maxQueueSize - qlength) {
      this.queue.push(...events.slice(0, this.maxQueueSize - qlength));
    } else {
      this.queue.push(...events);
    }
  }

  public clearEvents() {
    this.queue = [];
  }

  public getEvents(): TelemetryEvent[] {
    return this.queue;
  }
}

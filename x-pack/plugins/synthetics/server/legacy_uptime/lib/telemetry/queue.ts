/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const TELEMETRY_MAX_QUEUE_SIZE = 100;

export class TelemetryQueue<T> {
  private maxQueueSize = TELEMETRY_MAX_QUEUE_SIZE;
  private queue: T[] = [];

  public addEvents(events: T[]) {
    const qlength = this.queue.length;

    if (events.length === 0) {
      return;
    }

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

  public getEvents(): T[] {
    return this.queue;
  }
}

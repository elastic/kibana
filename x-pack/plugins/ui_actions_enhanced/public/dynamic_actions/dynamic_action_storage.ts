/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable max-classes-per-file */

import { Observable, Subject } from 'rxjs';
import { SerializedEvent } from './types';

/**
 * This CRUD interface needs to be implemented by dynamic action users if they
 * want to persist the dynamic actions. It has a default implementation in
 * Embeddables, however one can use the dynamic actions without Embeddables,
 * in that case they have to implement this interface.
 */
export interface ActionStorage {
  create(event: SerializedEvent): Promise<void>;
  update(event: SerializedEvent): Promise<void>;
  remove(eventId: string): Promise<void>;
  read(eventId: string): Promise<SerializedEvent>;
  count(): Promise<number>;
  list(): Promise<SerializedEvent[]>;

  /**
   * Triggered every time events changed in storage and should be re-loaded.
   */
  readonly reload$?: Observable<void>;
}

export abstract class AbstractActionStorage implements ActionStorage {
  public readonly reload$: Observable<void> & Pick<Subject<void>, 'next'> = new Subject<void>();

  public async count(): Promise<number> {
    return (await this.list()).length;
  }

  public async read(eventId: string): Promise<SerializedEvent> {
    const events = await this.list();
    const event = events.find((ev) => ev.eventId === eventId);
    if (!event) throw new Error(`Event [eventId = ${eventId}] not found.`);
    return event;
  }

  abstract create(event: SerializedEvent): Promise<void>;
  abstract update(event: SerializedEvent): Promise<void>;
  abstract remove(eventId: string): Promise<void>;
  abstract list(): Promise<SerializedEvent[]>;
}

/**
 * This is an in-memory implementation of ActionStorage. It is used in testing,
 * but can also be used production code to store events in memory.
 */
export class MemoryActionStorage extends AbstractActionStorage {
  constructor(public events: readonly SerializedEvent[] = []) {
    super();
  }

  public async list() {
    return this.events.map((event) => ({ ...event }));
  }

  public async create(event: SerializedEvent) {
    this.events = [...this.events, { ...event }];
  }

  public async update(event: SerializedEvent) {
    const index = this.events.findIndex(({ eventId }) => eventId === event.eventId);
    if (index < 0) throw new Error(`Event [eventId = ${event.eventId}] not found`);
    this.events = [...this.events.slice(0, index), { ...event }, ...this.events.slice(index + 1)];
  }

  public async remove(eventId: string) {
    const index = this.events.findIndex((ev) => eventId === ev.eventId);
    if (index < 0) throw new Error(`Event [eventId = ${eventId}] not found`);
    this.events = [...this.events.slice(0, index), ...this.events.slice(index + 1)];
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonFields, EventLogDefinition } from '../common';
import { IEventLogRegistry, IEventLogProvider } from './internal_api';

const getRegistryKey = (definition: EventLogDefinition<any>, spaceId: string) =>
  `${definition.logName}-${spaceId}`;

interface RegistryEntry {
  definition: EventLogDefinition<any>;
  spaceId: string;
  provider: IEventLogProvider<any>;
}

export class EventLogRegistry implements IEventLogRegistry {
  private readonly map = new Map<string, RegistryEntry>();

  public get<TEvent extends CommonFields>(
    definition: EventLogDefinition<TEvent>,
    spaceId: string
  ): IEventLogProvider<TEvent> | null {
    const key = getRegistryKey(definition, spaceId);
    const entry = this.map.get(key);
    return entry != null ? (entry.provider as IEventLogProvider<TEvent>) : null;
  }

  public add<TEvent extends CommonFields>(
    definition: EventLogDefinition<TEvent>,
    spaceId: string,
    provider: IEventLogProvider<TEvent>
  ): void {
    const key = getRegistryKey(definition, spaceId);

    if (this.map.has(key)) {
      throw new Error(`Event log already registered, key="${key}"`);
    }

    this.map.set(key, {
      definition,
      spaceId,
      provider,
    });
  }

  public async shutdown(): Promise<void> {
    const entries = Array.from(this.map.values());
    const promises = entries.map(({ provider }) => provider.shutdownLog());
    await Promise.all(promises);
  }
}

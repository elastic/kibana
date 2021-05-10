/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMap } from '../event_schema';
import { IEventLogDefinition, IEventLogProvider } from './public_api';
import { IEventLogRegistry } from './internal_api';

const getRegistryKey = (definition: IEventLogDefinition<any>, spaceId: string) =>
  `${definition.eventLogName}-${spaceId}`;

interface RegistryEntry {
  definition: IEventLogDefinition<any>;
  spaceId: string;
  provider: IEventLogProvider<any>;
  closeLog: () => Promise<void>;
}

export class EventLogRegistry implements IEventLogRegistry {
  private readonly map = new Map<string, RegistryEntry>();

  public get<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string
  ): IEventLogProvider<TMap> | null {
    const key = getRegistryKey(definition, spaceId);
    const entry = this.map.get(key);
    return entry != null ? (entry.provider as IEventLogProvider<TMap>) : null;
  }

  public add<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string,
    provider: IEventLogProvider<TMap>,
    closeLog: () => Promise<void>
  ): void {
    const key = getRegistryKey(definition, spaceId);

    if (this.map.has(key)) {
      throw new Error(`Event log already registered, key="${key}"`);
    }

    this.map.set(key, {
      definition,
      spaceId,
      provider,
      closeLog,
    });
  }

  public async close(): Promise<void> {
    const entries = Array.from(this.map.values());
    const promises = entries.map(({ closeLog }) => closeLog());
    await Promise.all(promises);
  }
}

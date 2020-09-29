/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { LegacyClusterClient } from 'src/core/server';

import { Plugin } from './plugin';
import { EsContext } from './es';
import { IEvent, IEventLogger, IEventLogService, IEventLogConfig } from './types';
import { EventLogger } from './event_logger';
import { SavedObjectProvider, SavedObjectProviderRegistry } from './saved_object_provider_registry';
export type PluginClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

type SystemLogger = Plugin['systemLogger'];

interface EventLogServiceCtorParams {
  config: IEventLogConfig;
  esContext: EsContext;
  kibanaUUID: string;
  systemLogger: SystemLogger;
  savedObjectProviderRegistry: SavedObjectProviderRegistry;
}

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogService implements IEventLogService {
  private config: IEventLogConfig;
  private esContext: EsContext;
  private systemLogger: SystemLogger;
  private registeredProviderActions: Map<string, Set<string>>;
  private savedObjectProviderRegistry: SavedObjectProviderRegistry;

  public readonly kibanaUUID: string;

  constructor({
    config,
    esContext,
    kibanaUUID,
    systemLogger,
    savedObjectProviderRegistry,
  }: EventLogServiceCtorParams) {
    this.config = config;
    this.esContext = esContext;
    this.kibanaUUID = kibanaUUID;
    this.systemLogger = systemLogger;
    this.registeredProviderActions = new Map<string, Set<string>>();
    this.savedObjectProviderRegistry = savedObjectProviderRegistry;
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public isLoggingEntries(): boolean {
    return this.isEnabled() && this.config.logEntries;
  }

  public isIndexingEntries(): boolean {
    return this.isEnabled() && this.config.indexEntries;
  }

  registerProviderActions(provider: string, actions: string[]): void {
    if (actions.length === 0) {
      throw new Error(`actions parameter must not be empty for provider: "${provider}"`);
    }

    if (this.registeredProviderActions.has(provider)) {
      throw new Error(`provider already registered: "${provider}"`);
    }

    this.registeredProviderActions.set(provider, new Set(actions));
  }

  isProviderActionRegistered(provider: string, action: string): boolean {
    const actions = this.registeredProviderActions.get(provider);
    if (actions == null) return false;

    if (actions.has(action)) return true;

    return false;
  }

  getProviderActions() {
    return new Map(this.registeredProviderActions.entries());
  }

  registerSavedObjectProvider(type: string, provider: SavedObjectProvider) {
    return this.savedObjectProviderRegistry.registerProvider(type, provider);
  }

  getLogger(initialProperties: IEvent): IEventLogger {
    return new EventLogger({
      esContext: this.esContext,
      eventLogService: this,
      initialProperties,
      systemLogger: this.systemLogger,
    });
  }
}

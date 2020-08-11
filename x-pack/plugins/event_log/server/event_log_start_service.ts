/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { LegacyClusterClient, KibanaRequest } from 'src/core/server';
import { SpacesServiceSetup } from '../../spaces/server';

import { EsContext } from './es';
import { IEventLogClientService } from './types';
import { EventLogClient } from './event_log_client';
import { SavedObjectProviderRegistry } from './saved_object_provider_registry';
export type PluginClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

interface EventLogServiceCtorParams {
  esContext: EsContext;
  savedObjectProviderRegistry: SavedObjectProviderRegistry;
  spacesService?: SpacesServiceSetup;
}

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogClientService implements IEventLogClientService {
  private esContext: EsContext;
  private savedObjectProviderRegistry: SavedObjectProviderRegistry;
  private spacesService?: SpacesServiceSetup;

  constructor({
    esContext,
    savedObjectProviderRegistry,
    spacesService,
  }: EventLogServiceCtorParams) {
    this.esContext = esContext;
    this.savedObjectProviderRegistry = savedObjectProviderRegistry;
    this.spacesService = spacesService;
  }

  getClient(request: KibanaRequest) {
    return new EventLogClient({
      esContext: this.esContext,
      savedObjectGetter: this.savedObjectProviderRegistry.getProvidersClient(request),
      spacesService: this.spacesService,
      request,
    });
  }
}

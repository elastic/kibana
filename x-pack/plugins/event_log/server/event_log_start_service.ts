/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import {
  LegacyClusterClient,
  KibanaRequest,
  SavedObjectsServiceStart,
  SavedObjectsClientContract,
} from 'src/core/server';
import { SpacesServiceSetup } from '../../spaces/server';

import { EsContext } from './es';
import { IEventLogClientService } from './types';
import { EventLogClient } from './event_log_client';
export type PluginClusterClient = Pick<LegacyClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

const includedHiddenTypes = ['action', 'alert'];

interface EventLogServiceCtorParams {
  esContext: EsContext;
  savedObjectsService: SavedObjectsServiceStart;
  spacesService?: SpacesServiceSetup;
}

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogClientService implements IEventLogClientService {
  private esContext: EsContext;
  private savedObjectsService: SavedObjectsServiceStart;
  private spacesService?: SpacesServiceSetup;

  constructor({ esContext, savedObjectsService, spacesService }: EventLogServiceCtorParams) {
    this.esContext = esContext;
    this.savedObjectsService = savedObjectsService;
    this.spacesService = spacesService;
  }

  getClient(request: KibanaRequest) {
    const savedObjectsClient: SavedObjectsClientContract = this.savedObjectsService.getScopedClient(
      request,
      { includedHiddenTypes }
    );

    return new EventLogClient({
      esContext: this.esContext,
      savedObjectsClient,
      spacesService: this.spacesService,
      request,
    });
  }
}

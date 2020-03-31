/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { ClusterClient, SavedObjectsClientContract } from 'src/core/server';

import { EsContext } from './es';
import { IEventLogClient, IEvent } from './types';
import { GetEventsOptions } from './es/cluster_client_adapter';
export type PluginClusterClient = Pick<ClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

interface EventLogServiceCtorParams {
  esContext: EsContext;
  savedObjectsClient: SavedObjectsClientContract;
}

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogClient implements IEventLogClient {
  private esContext: EsContext;
  private savedObjectsClient: SavedObjectsClientContract;

  constructor({ esContext, savedObjectsClient }: EventLogServiceCtorParams) {
    this.esContext = esContext;
    this.savedObjectsClient = savedObjectsClient;
  }

  async getEventsBySavedObject(type: string, id: string, options: Partial<GetEventsOptions> = {}) {
    await this.savedObjectsClient.get(type, id);
    return (await this.esContext.esAdapter.queryEventsBySavedObject(
      this.esContext.esNames.alias,
      type,
      id,
      options
    )) as IEvent[];
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { ClusterClient, SavedObjectsClientContract } from 'src/core/server';

import { schema, TypeOf } from '@kbn/config-schema';
import { EsContext } from './es';
import { IEventLogClient, IEvent } from './types';
export type PluginClusterClient = Pick<ClusterClient, 'callAsInternalUser' | 'asScoped'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

interface EventLogServiceCtorParams {
  esContext: EsContext;
  savedObjectsClient: SavedObjectsClientContract;
}

export const findOptionsSchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
});
export type FindOptionsType = TypeOf<typeof findOptionsSchema>;

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogClient implements IEventLogClient {
  private esContext: EsContext;
  private savedObjectsClient: SavedObjectsClientContract;

  constructor({ esContext, savedObjectsClient }: EventLogServiceCtorParams) {
    this.esContext = esContext;
    this.savedObjectsClient = savedObjectsClient;
  }

  async findEventsBySavedObject(
    type: string,
    id: string,
    options: Partial<FindOptionsType> = {}
  ): Promise<IEvent[]> {
    const { per_page: size, page } = findOptionsSchema.validate(options);
    await this.savedObjectsClient.get(type, id);
    return (await this.esContext.esAdapter.queryEventsBySavedObject(
      this.esContext.esNames.alias,
      type,
      id,
      { size, from: (page - 1) * size }
    )) as IEvent[];
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';
import { IClusterClient, KibanaRequest } from 'src/core/server';
import { SpacesServiceStart } from '../../spaces/server';

import { EsContext } from './es';
import { IEventLogClient } from './types';
import { QueryEventsBySavedObjectResult } from './es/cluster_client_adapter';
import { SavedObjectBulkGetterResult } from './saved_object_provider_registry';
export type PluginClusterClient = Pick<IClusterClient, 'asInternalUser'>;
export type AdminClusterClient$ = Observable<PluginClusterClient>;

const optionalDateFieldSchema = schema.maybe(
  schema.string({
    validate(value) {
      if (isNaN(Date.parse(value))) {
        return 'Invalid Date';
      }
    },
  })
);

export const findOptionsSchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  start: optionalDateFieldSchema,
  end: optionalDateFieldSchema,
  sort_field: schema.oneOf(
    [
      schema.literal('@timestamp'),
      schema.literal('event.start'),
      schema.literal('event.end'),
      schema.literal('event.provider'),
      schema.literal('event.duration'),
      schema.literal('event.action'),
      schema.literal('message'),
    ],
    {
      defaultValue: '@timestamp',
    }
  ),
  sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
    defaultValue: 'asc',
  }),
  filter: schema.maybe(schema.string()),
});
// page & perPage are required, other fields are optional
// using schema.maybe allows us to set undefined, but not to make the field optional
export type FindOptionsType = Pick<
  TypeOf<typeof findOptionsSchema>,
  'page' | 'per_page' | 'sort_field' | 'sort_order' | 'filter'
> &
  Partial<TypeOf<typeof findOptionsSchema>>;

interface EventLogServiceCtorParams {
  esContext: EsContext;
  savedObjectGetter: SavedObjectBulkGetterResult;
  spacesService?: SpacesServiceStart;
  request: KibanaRequest;
}

// note that clusterClient may be null, indicating we can't write to ES
export class EventLogClient implements IEventLogClient {
  private esContext: EsContext;
  private savedObjectGetter: SavedObjectBulkGetterResult;
  private spacesService?: SpacesServiceStart;
  private request: KibanaRequest;

  constructor({ esContext, savedObjectGetter, spacesService, request }: EventLogServiceCtorParams) {
    this.esContext = esContext;
    this.savedObjectGetter = savedObjectGetter;
    this.spacesService = spacesService;
    this.request = request;
  }

  async findEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<FindOptionsType>
  ): Promise<QueryEventsBySavedObjectResult> {
    const findOptions = findOptionsSchema.validate(options ?? {});

    const space = await this.spacesService?.getActiveSpace(this.request);
    const namespace = space && this.spacesService?.spaceIdToNamespace(space.id);

    // verify the user has the required permissions to view this saved objects
    await this.savedObjectGetter(type, ids);

    return await this.esContext.esAdapter.queryEventsBySavedObjects(
      this.esContext.esNames.indexPattern,
      namespace,
      type,
      ids,
      findOptions
    );
  }
}

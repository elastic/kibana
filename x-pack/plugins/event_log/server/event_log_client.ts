/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';
import { IClusterClient, KibanaRequest } from '@kbn/core/server';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SpacesServiceStart } from '@kbn/spaces-plugin/server';

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

const sortSchema = schema.object({
  sort_field: schema.oneOf([
    schema.literal('@timestamp'),
    schema.literal('event.start'),
    schema.literal('event.end'),
    schema.literal('event.provider'),
    schema.literal('event.duration'),
    schema.literal('event.action'),
    schema.literal('message'),
  ]),
  sort_order: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
});

export const queryOptionsSchema = schema.object({
  per_page: schema.number({ defaultValue: 10, min: 0 }),
  page: schema.number({ defaultValue: 1, min: 1 }),
  start: optionalDateFieldSchema,
  end: optionalDateFieldSchema,
  sort: schema.arrayOf(sortSchema, {
    defaultValue: [{ sort_field: '@timestamp', sort_order: 'asc' }],
  }),
  filter: schema.maybe(schema.string()),
});

export type QueryOptionsType = Pick<TypeOf<typeof queryOptionsSchema>, 'start' | 'end' | 'filter'>;

// page & perPage are required, other fields are optional
// using schema.maybe allows us to set undefined, but not to make the field optional
export type FindOptionsType = Pick<
  TypeOf<typeof queryOptionsSchema>,
  'page' | 'per_page' | 'sort' | 'filter'
> &
  Partial<TypeOf<typeof queryOptionsSchema>>;

export type AggregateOptionsType = Pick<TypeOf<typeof queryOptionsSchema>, 'filter'> &
  Partial<TypeOf<typeof queryOptionsSchema>> & {
    aggs: Record<string, estypes.AggregationsAggregationContainer>;
  };

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

  public async findEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: Partial<FindOptionsType>,
    legacyIds?: string[]
  ): Promise<QueryEventsBySavedObjectResult> {
    const findOptions = queryOptionsSchema.validate(options ?? {});

    // verify the user has the required permissions to view this saved object
    await this.savedObjectGetter(type, ids);

    return await this.esContext.esAdapter.queryEventsBySavedObjects({
      index: this.esContext.esNames.indexPattern,
      namespace: await this.getNamespace(),
      type,
      ids,
      findOptions,
      legacyIds,
    });
  }

  public async aggregateEventsBySavedObjectIds(
    type: string,
    ids: string[],
    options?: AggregateOptionsType,
    legacyIds?: string[]
  ) {
    const aggs = options?.aggs;
    if (!aggs) {
      throw new Error('No aggregation defined!');
    }

    // validate other query options separately from
    const aggregateOptions = queryOptionsSchema.validate(omit(options, 'aggs') ?? {});

    // verify the user has the required permissions to view this saved object
    await this.savedObjectGetter(type, ids);

    return await this.esContext.esAdapter.aggregateEventsBySavedObjects({
      index: this.esContext.esNames.indexPattern,
      namespace: await this.getNamespace(),
      type,
      ids,
      aggregateOptions: { ...aggregateOptions, aggs } as AggregateOptionsType,
      legacyIds,
    });
  }

  private async getNamespace() {
    const space = await this.spacesService?.getActiveSpace(this.request);
    return space && this.spacesService?.spaceIdToNamespace(space.id);
  }
}

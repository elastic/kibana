/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IClusterClient, KibanaRequest, Logger } from 'kibana/server';
import { SpacesServiceStart } from '../../../../spaces/server';

import { IlmPolicy, IndexNames, IndexSpecification } from '../elasticsearch';
import { FieldMap, Event, EventSchema } from '../event_schema';
import { DeepPartial } from '../utils/utility_types';

export { IlmPolicy, IndexSpecification };

// -------------------------------------------------------------------------------------------------
// Definition API (defining log hierarchies as simple objects)

export interface EventLogOptions<TMap extends FieldMap> {
  name: string;
  schema: EventSchema<TMap>;
  ilmPolicy?: IlmPolicy;
}

export interface IEventLogDefinition<TMap extends FieldMap> {
  eventLogName: string;
  eventSchema: EventSchema<TMap>;
  ilmPolicy: IlmPolicy;

  defineChild<TExtMap extends FieldMap>(
    options: EventLogOptions<TExtMap>
  ): IEventLogDefinition<TMap & TExtMap>;
}

// -------------------------------------------------------------------------------------------------
// Resolving and bootstrapping API (creating runtime objects representing logs, bootstrapping indices)

export interface EventLogServiceConfig {
  indexPrefix: string;
  isWriteEnabled: boolean;
}

export interface EventLogServiceDependencies {
  clusterClient: Promise<IClusterClient>;
  spacesService: Promise<SpacesServiceStart>;
  logger: Logger;
}

export interface IEventLogService {
  getResolver(bootstrapLog?: boolean): IEventLogResolver;
  getScopedResolver(request: KibanaRequest, bootstrapLog?: boolean): IScopedEventLogResolver;
}

export interface IEventLogResolver {
  resolve<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>,
    spaceId: string
  ): Promise<IEventLog<Event<TMap>>>;
}

export interface IScopedEventLogResolver {
  resolve<TMap extends FieldMap>(
    definition: IEventLogDefinition<TMap>
  ): Promise<IEventLog<Event<TMap>>>;
}

export interface IEventLog<TEvent> extends IEventLoggerTemplate<TEvent> {
  getNames(): IndexNames;

  getQueryBuilder(): IEventQueryBuilder<TEvent>;

  search<TDocument = TEvent>(
    request: estypes.SearchRequest
  ): Promise<estypes.SearchResponse<TDocument>>;
}

// -------------------------------------------------------------------------------------------------
// Write API (logging events)

export interface IEventLoggerTemplate<TEvent> {
  getLoggerTemplate(fields: DeepPartial<TEvent>): IEventLoggerTemplate<TEvent>;
  getLogger(name: string, fields?: DeepPartial<TEvent>): IEventLogger<TEvent>;
}

export interface IEventLogger<TEvent> extends IEventLoggerTemplate<TEvent> {
  logEvent(fields: DeepPartial<TEvent>): void;
}

// -------------------------------------------------------------------------------------------------
// Read API (searching, filtering, sorting, pagination, aggregation over events)

export interface IEventQueryBuilder<TEvent> {
  filterByLogger(loggerName: string): IEventQueryBuilder<TEvent>;
  filterByFields(fields: DeepPartial<TEvent>): IEventQueryBuilder<TEvent>;
  filterByKql(kql: string): IEventQueryBuilder<TEvent>;
  sortBy(params: SortingParams): IEventQueryBuilder<TEvent>;
  paginate(params: PaginationParams): IEventQueryBuilder<TEvent>;

  buildQuery(): IEventQuery<TEvent>;
}

export type SortingParams = estypes.SearchSort;

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface IEventQuery<TEvent> {
  execute(): Promise<TEvent[]>;
}

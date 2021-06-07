/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { IClusterClient, KibanaRequest, Logger } from 'kibana/server';
import { SpacesServiceStart } from '../../../../spaces/server';

import { CommonFields, EventLogDefinition, IndexNames } from '../common';
import { DeepPartial } from '../utils/utility_types';

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
  resolve<TEvent extends CommonFields>(
    logDefinition: EventLogDefinition<TEvent>,
    spaceId: string
  ): Promise<IEventLog<TEvent>>;
}

export interface IScopedEventLogResolver {
  resolve<TEvent extends CommonFields>(
    logDefinition: EventLogDefinition<TEvent>
  ): Promise<IEventLog<TEvent>>;
}

export interface IEventLog<TEvent extends CommonFields> extends IEventLoggerTemplate<TEvent> {
  getNames(): IndexNames;

  getQueryBuilder(): IEventQueryBuilder<TEvent>;

  search<TDocument = TEvent>(
    request: estypes.SearchRequest
  ): Promise<estypes.SearchResponse<TDocument>>;
}

// -------------------------------------------------------------------------------------------------
// Write API (logging events)

export interface IEventLoggerTemplate<TEvent extends CommonFields> {
  getLoggerTemplate(fields: DeepPartial<TEvent>): IEventLoggerTemplate<TEvent>;
  getLogger(name: string, fields?: DeepPartial<TEvent>): IEventLogger<TEvent>;
}

export interface IEventLogger<TEvent extends CommonFields> extends IEventLoggerTemplate<TEvent> {
  logEvent(fields: DeepPartial<TEvent>): void;
}

// -------------------------------------------------------------------------------------------------
// Read API (searching, filtering, sorting, pagination, aggregation over events)

export interface IEventQueryBuilder<TEvent extends CommonFields> {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IEsSearchRequest } from '../../../../../../src/plugins/data/common';
import { ESQuery } from '../../typed_json';
import {
  TimelineEventsQueries,
  TimelineEventsAllRequestOptions,
  TimelineEventsAllStrategyResponse,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsLastEventTimeRequestOptions,
  TimelineEventsLastEventTimeStrategyResponse,
} from './events';
import { DocValueFields, PaginationInputPaginated, TimerangeInput, SortField } from '../common';

export * from './events';

export type TimelineFactoryQueryTypes = TimelineEventsQueries;

export interface TimelineRequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  factoryQueryType?: TimelineFactoryQueryTypes;
}

export interface TimelineRequestSortField<Field = string> extends SortField<Field> {
  type: string;
}

export interface TimelineRequestOptionsPaginated<Field = string>
  extends TimelineRequestBasicOptions {
  pagination: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  sort: Array<TimelineRequestSortField<Field>>;
}

export type TimelineStrategyResponseType<
  T extends TimelineFactoryQueryTypes
> = T extends TimelineEventsQueries.all
  ? TimelineEventsAllStrategyResponse
  : T extends TimelineEventsQueries.details
  ? TimelineEventsDetailsStrategyResponse
  : T extends TimelineEventsQueries.lastEventTime
  ? TimelineEventsLastEventTimeStrategyResponse
  : never;

export type TimelineStrategyRequestType<
  T extends TimelineFactoryQueryTypes
> = T extends TimelineEventsQueries.all
  ? TimelineEventsAllRequestOptions
  : T extends TimelineEventsQueries.details
  ? TimelineEventsDetailsRequestOptions
  : T extends TimelineEventsQueries.lastEventTime
  ? TimelineEventsLastEventTimeRequestOptions
  : never;

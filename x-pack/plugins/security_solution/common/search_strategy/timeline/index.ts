/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEsSearchRequest } from '@kbn/data-plugin/common';
import { ESQuery } from '../../typed_json';
import {
  TimelineEventsQueries,
  TimelineEventsAllRequestOptions,
  TimelineEventsAllStrategyResponse,
  TimelineEventsDetailsRequestOptions,
  TimelineEventsDetailsStrategyResponse,
  TimelineEventsLastEventTimeRequestOptions,
  TimelineEventsLastEventTimeStrategyResponse,
  TimelineKpiStrategyResponse,
} from './events';
import {
  DocValueFields,
  PaginationInputPaginated,
  TimerangeInput,
  SortField,
  Maybe,
} from '../common';
import {
  DataProviderType,
  TimelineType,
  TimelineStatus,
  RowRendererId,
} from '../../types/timeline';

export * from './events';

export type TimelineFactoryQueryTypes = TimelineEventsQueries;

export interface TimelineRequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  factoryQueryType?: TimelineFactoryQueryTypes;
  runtimeMappings: MappingRuntimeFields;
}

export interface TimelineRequestSortField<Field = string> extends SortField<Field> {
  type: string;
}

export interface TimelineRequestOptionsPaginated<Field = string>
  extends TimelineRequestBasicOptions {
  pagination: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  sort: Array<TimelineRequestSortField<Field>>;
}

export type TimelineStrategyResponseType<T extends TimelineFactoryQueryTypes> =
  T extends TimelineEventsQueries.all
    ? TimelineEventsAllStrategyResponse
    : T extends TimelineEventsQueries.details
    ? TimelineEventsDetailsStrategyResponse
    : T extends TimelineEventsQueries.kpi
    ? TimelineKpiStrategyResponse
    : T extends TimelineEventsQueries.lastEventTime
    ? TimelineEventsLastEventTimeStrategyResponse
    : never;

export type TimelineStrategyRequestType<T extends TimelineFactoryQueryTypes> =
  T extends TimelineEventsQueries.all
    ? TimelineEventsAllRequestOptions
    : T extends TimelineEventsQueries.details
    ? TimelineEventsDetailsRequestOptions
    : T extends TimelineEventsQueries.kpi
    ? TimelineRequestBasicOptions
    : T extends TimelineEventsQueries.lastEventTime
    ? TimelineEventsLastEventTimeRequestOptions
    : never;

export interface ColumnHeaderInput {
  aggregatable?: Maybe<boolean>;
  category?: Maybe<string>;
  columnHeaderType?: Maybe<string>;
  description?: Maybe<string>;
  example?: Maybe<string>;
  indexes?: Maybe<string[]>;
  id?: Maybe<string>;
  name?: Maybe<string>;
  placeholder?: Maybe<string>;
  searchable?: Maybe<boolean>;
  type?: Maybe<string>;
}

export interface QueryMatchInput {
  field?: Maybe<string>;

  displayField?: Maybe<string>;

  value?: Maybe<string>;

  displayValue?: Maybe<string>;

  operator?: Maybe<string>;
}

export interface DataProviderInput {
  id?: Maybe<string>;
  name?: Maybe<string>;
  enabled?: Maybe<boolean>;
  excluded?: Maybe<boolean>;
  kqlQuery?: Maybe<string>;
  queryMatch?: Maybe<QueryMatchInput>;
  and?: Maybe<DataProviderInput[]>;
  type?: Maybe<DataProviderType>;
}

export interface EqlOptionsInput {
  eventCategoryField?: Maybe<string>;
  tiebreakerField?: Maybe<string>;
  timestampField?: Maybe<string>;
  query?: Maybe<string>;
  size?: Maybe<number>;
}

export interface FilterMetaTimelineInput {
  alias?: Maybe<string>;
  controlledBy?: Maybe<string>;
  disabled?: Maybe<boolean>;
  field?: Maybe<string>;
  formattedValue?: Maybe<string>;
  index?: Maybe<string>;
  key?: Maybe<string>;
  negate?: Maybe<boolean>;
  params?: Maybe<string>;
  type?: Maybe<string>;
  value?: Maybe<string>;
}

export interface FilterTimelineInput {
  exists?: Maybe<string>;
  meta?: Maybe<FilterMetaTimelineInput>;
  match_all?: Maybe<string>;
  missing?: Maybe<string>;
  query?: Maybe<string>;
  range?: Maybe<string>;
  script?: Maybe<string>;
}

export interface SerializedFilterQueryInput {
  filterQuery?: Maybe<SerializedKueryQueryInput>;
}

export interface SerializedKueryQueryInput {
  kuery?: Maybe<KueryFilterQueryInput>;
  serializedQuery?: Maybe<string>;
}

export interface KueryFilterQueryInput {
  kind?: Maybe<string>;
  expression?: Maybe<string>;
}

export interface DateRangePickerInput {
  start?: Maybe<number>;
  end?: Maybe<number>;
}

export interface SortTimelineInput {
  columnId?: Maybe<string>;
  sortDirection?: Maybe<string>;
}

export interface TimelineInput {
  columns?: Maybe<ColumnHeaderInput[]>;
  dataProviders?: Maybe<DataProviderInput[]>;
  dataViewId?: Maybe<string>;
  description?: Maybe<string>;
  eqlOptions?: Maybe<EqlOptionsInput>;
  eventType?: Maybe<string>;
  excludedRowRendererIds?: Maybe<RowRendererId[]>;
  filters?: Maybe<FilterTimelineInput[]>;
  kqlMode?: Maybe<string>;
  kqlQuery?: Maybe<SerializedFilterQueryInput>;
  indexNames?: Maybe<string[]>;
  title?: Maybe<string>;
  templateTimelineId?: Maybe<string>;
  templateTimelineVersion?: Maybe<number>;
  timelineType?: Maybe<TimelineType>;
  dateRange?: Maybe<DateRangePickerInput>;
  savedQueryId?: Maybe<string>;
  sort?: Maybe<SortTimelineInput[]>;
  status?: Maybe<TimelineStatus>;
}

export enum FlowDirection {
  uniDirectional = 'uniDirectional',
  biDirectional = 'biDirectional',
}

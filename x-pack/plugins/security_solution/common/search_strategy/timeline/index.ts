/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEsSearchRequest } from '../../../../../../src/plugins/data/common';
import { ESQuery } from '../../typed_json';
import { Ecs } from '../../ecs';
import {
  CursorType,
  Maybe,
  TimerangeInput,
  DocValueFields,
  PaginationInput,
  PaginationInputPaginated,
  SortField,
} from '../common';
import { TimelineDetailsRequestOptions, TimelineDetailsStrategyResponse } from './details';

export * from './details';

export enum TimelineQueries {
  details = 'details',
}

export type TimelineFactoryQueryTypes = TimelineQueries;

export interface TimelineEdges {
  node: TimelineItem;
  cursor: CursorType;
}

export interface TimelineItem {
  _id: string;
  _index?: Maybe<string>;
  data: TimelineNonEcsData[];
  ecs: Ecs;
}

export interface TimelineNonEcsData {
  field: string;
  value?: Maybe<string[] | string>;
}

export interface TimelineRequestBasicOptions extends IEsSearchRequest {
  timerange: TimerangeInput;
  filterQuery: ESQuery | string | undefined;
  defaultIndex: string[];
  docValueFields?: DocValueFields[];
  factoryQueryType?: TimelineFactoryQueryTypes;
}

export interface TimelineRequestOptions extends TimelineRequestBasicOptions {
  pagination: PaginationInput;
  sortField?: SortField;
}

export interface TimelineRequestOptionsPaginated extends TimelineRequestBasicOptions {
  pagination: PaginationInputPaginated;
  sortField?: SortField;
}

export type TimelineStrategyResponseType<
  T extends TimelineFactoryQueryTypes
> = T extends TimelineQueries.details ? TimelineDetailsStrategyResponse : never;

export type TimelineStrategyRequestType<
  T extends TimelineFactoryQueryTypes
> = T extends TimelineQueries.details ? TimelineDetailsRequestOptions : never;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { IEsSearchResponse } from '../../../../../../src/plugins/data/common';

export type Maybe<T> = T | null;

export type SearchHit = IEsSearchResponse<object>['rawResponse']['hits']['hits'][0];

export interface TotalValue {
  value: number;
  relation: string;
}

export interface Inspect {
  dsl: string[];
}

export interface PageInfoPaginated {
  activePage: number;
  fakeTotalCount: number;
  showMorePagesIndicator: boolean;
}

export interface CursorType {
  value?: Maybe<string>;
  tiebreaker?: Maybe<string>;
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export interface SortField<Field = string> {
  field: Field;
  direction: Direction;
}

export interface TimerangeInput {
  /** The interval string to use for last bucket. The format is '{value}{unit}'. For example '5m' would return the metrics for the last 5 minutes of the timespan. */
  interval: string;
  /** The end of the timerange */
  to: string;
  /** The beginning of the timerange */
  from: string;
}

export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<string>;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<string>;
}

export interface PaginationInputPaginated {
  /** The activePage parameter defines the page of results you want to fetch */
  activePage: number;
  /** The cursorStart parameter defines the start of the results to be displayed */
  cursorStart: number;
  /** The fakePossibleCount parameter determines the total count in order to show 5 additional pages */
  fakePossibleCount: number;
  /** The querySize parameter is the number of items to be returned */
  querySize: number;
}

export type DocValueFields = estypes.SearchDocValueField;

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export type StringOrNumber = string | number;

export interface TimerangeFilter {
  range: {
    [timestamp: string]: {
      gte: string;
      lte: string;
      format: string;
    };
  };
}

export interface Fields<T = unknown[]> {
  [x: string]: T | Array<Fields<T>>;
}

export interface EventSource {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EventHit extends estypes.SearchHit<Record<string, any>> {
  sort: string[];
  fields: Fields;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IEsSearchResponse } from '@kbn/data-plugin/common';
export type {
  Inspect,
  SortField,
  TimerangeInput,
  PaginationInputPaginated,
  DocValueFields,
  CursorType,
  TotalValue,
} from '@kbn/timelines-plugin/common';
export { Direction } from '@kbn/timelines-plugin/common';

export type Maybe<T> = T | null;

export type SearchHit = IEsSearchResponse<object>['rawResponse']['hits']['hits'][0];

export interface PageInfoPaginated {
  activePage: number;
  fakeTotalCount: number;
  showMorePagesIndicator: boolean;
}
export interface PaginationInput {
  /** The limit parameter allows you to configure the maximum amount of items to be returned */
  limit: number;
  /** The cursor parameter defines the next result you want to fetch */
  cursor?: Maybe<string>;
  /** The tiebreaker parameter allow to be more precise to fetch the next item */
  tiebreaker?: Maybe<string>;
}

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface TotalHit {
  value: number;
  relation: string;
}

export interface Hit {
  _index: string;
  _type: string;
  _id: string;
  _score: number | null;
}

export interface Hits<T, U> {
  hits: {
    total: T;
    max_score: number | null;
    hits: U[];
  };
}

export interface GenericBuckets {
  key: string;
  doc_count: number;
}

export type StringOrNumber = string | number;

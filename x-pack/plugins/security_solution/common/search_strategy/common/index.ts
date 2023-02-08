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
  CursorType,
  TotalValue,
} from '@kbn/timelines-plugin/common';
export { Direction } from '@kbn/timelines-plugin/common';

export type Maybe<T> = T | null;

export type SearchHit = IEsSearchResponse<object>['rawResponse']['hits']['hits'][0];

export interface KpiHistogramData {
  x?: Maybe<number>;
  y?: Maybe<number>;
}

export interface KpiHistogram<T> {
  key_as_string: string;
  key: number;
  doc_count: number;
  count: T;
}

export interface KpiGeneralHistogramCount {
  value?: number;
  doc_count?: number;
}

export interface PageInfoPaginated {
  activePage: number;
  fakeTotalCount: number;
  showMorePagesIndicator: boolean;
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
  key: string | string[];
  key_as_string?: string; // contains, for example, formatted dates
  doc_count: number;
}

export type StringOrNumber = string | number;

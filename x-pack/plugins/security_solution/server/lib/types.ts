/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuthenticatedUser } from '../../../security/common/model';
export { ConfigType as Configuration } from '../config';
import type { SecuritySolutionRequestHandlerContext } from '../types';

import { FrameworkAdapter, FrameworkRequest } from './framework';
import { IndexFields } from './index_fields';
import { SourceStatus } from './source_status';
import { Sources } from './sources';
import { Notes } from './timeline/saved_object/notes';
import { PinnedEvent } from './timeline/saved_object/pinned_events';
import { Timeline } from './timeline/saved_object/timelines';
import { TotalValue, BaseHit, Explanation } from '../../common/detection_engine/types';
import { SignalHit } from './detection_engine/signals/types';

export interface AppDomainLibs {
  fields: IndexFields;
}

export interface AppBackendLibs extends AppDomainLibs {
  framework: FrameworkAdapter;
  sources: Sources;
  sourceStatus: SourceStatus;
  timeline: Timeline;
  note: Notes;
  pinnedEvent: PinnedEvent;
}

export interface SiemContext {
  req: FrameworkRequest;
  context: SecuritySolutionRequestHandlerContext;
  user: AuthenticatedUser | null;
}

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  failures?: ShardError[];
}

/**
 * This type is being very conservative with the partials to not expect anything to
 * be guaranteed on the type as we don't have regular and proper types of ShardError.
 * Once we do, remove this type for the regular ShardError type from the elastic library.
 */
export type ShardError = Partial<{
  shard: number;
  index: string;
  node: string;
  reason: Partial<{
    type: string;
    reason: string;
    index_uuid: string;
    index: string;
    caused_by: Partial<{
      type: string;
      reason: string;
    }>;
  }>;
}>;

export interface SearchHits<T> {
  total: TotalValue | number;
  max_score: number;
  hits: Array<
    BaseHit<T> & {
      _type?: string;
      _score?: number;
      _version?: number;
      _explanation?: Explanation;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      highlight?: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }
  >;
}

export interface BaseSearchResponse<T> {
  hits: SearchHits<T>;
}

export interface SearchResponse<T> extends BaseSearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export type SearchSignalHit = SearchResponse<SignalHit>['hits']['hits'][0];

export interface TermAggregationBucket {
  key: string;
  doc_count: number;
  top_threshold_hits?: {
    hits: {
      hits: SearchHit[];
    };
  };
  cardinality_count?: {
    value: number;
  };
}

export interface TermAggregation {
  [agg: string]: {
    buckets: TermAggregationBucket[];
  };
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

export interface MSearchHeader {
  index: string[] | string;
  allowNoIndices?: boolean;
  ignoreUnavailable?: boolean;
}

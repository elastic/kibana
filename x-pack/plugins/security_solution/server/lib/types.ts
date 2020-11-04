/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuthenticatedUser } from '../../../security/common/model';
import { RequestHandlerContext } from '../../../../../src/core/server';
export { ConfigType as Configuration } from '../config';

import { FrameworkAdapter, FrameworkRequest } from './framework';
import { Hosts } from './hosts';
import { IndexFields } from './index_fields';
import { SourceStatus } from './source_status';
import { Sources } from './sources';
import { Note } from './note/saved_object';
import { PinnedEvent } from './pinned_event/saved_object';
import { Timeline } from './timeline/saved_object';
import { TotalValue, BaseHit, Explanation } from '../../common/detection_engine/types';

export * from './hosts';

export interface AppDomainLibs {
  fields: IndexFields;
  hosts: Hosts;
}

export interface AppBackendLibs extends AppDomainLibs {
  framework: FrameworkAdapter;
  sources: Sources;
  sourceStatus: SourceStatus;
  timeline: Timeline;
  note: Note;
  pinnedEvent: PinnedEvent;
}

export interface SiemContext {
  req: FrameworkRequest;
  context: RequestHandlerContext;
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

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: TotalValue | number;
    max_score: number;
    hits: Array<
      BaseHit<T> & {
        _type: string;
        _score: number;
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
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregations?: any;
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export interface TermAggregation {
  [agg: string]: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
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
export type SortRequestDirection = 'asc' | 'desc';

interface SortRequestField {
  [field: string]: SortRequestDirection;
}

export type SortRequest = SortRequestField[];

export interface MSearchHeader {
  index: string[] | string;
  allowNoIndices?: boolean;
  ignoreUnavailable?: boolean;
}

export interface AggregationRequest {
  [aggField: string]: {
    terms?: {
      field?: string;
      missing?: string;
      size?: number;
      script?: {
        source: string;
        lang: string;
      };
      order?: {
        [aggSortField: string]: SortRequestDirection;
      };
    };
    max?: {
      field: string;
    };
    aggs?: {
      [aggSortField: string]: {
        [aggType: string]: {
          field: string;
        };
      };
    };
    top_hits?: {
      size?: number;
      sort?: Array<{
        [aggSortField: string]: {
          order: SortRequestDirection;
        };
      }>;
      _source: {
        includes: string[];
      };
    };
  };
}

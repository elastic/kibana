/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceConfiguration, SuricataEvents, TimerangeInput } from '../../../common/graphql/types';
import { JsonObject } from '../../../common/typed_json';
import { FrameworkRequest } from '../framework';

export interface SuricataAdapter {
  getEvents(req: FrameworkRequest, options: SuricataRequestOptions): Promise<SuricataEvents[]>;
}

export type ESQuery = ESRangeQuery | ESQueryStringQuery | ESMatchQuery | JsonObject;

export interface ESRangeQuery {
  range: {
    [name: string]: {
      gte: number;
      lte: number;
      format: string;
    };
  };
}

export interface ESMatchQuery {
  match: {
    [name: string]: {
      query: string;
    };
  };
}

export interface ESQueryStringQuery {
  query_string: {
    query: string;
    analyze_wildcard: boolean;
  };
}

export interface SuricataRequestOptions {
  sourceConfiguration: SourceConfiguration;
  timerange: TimerangeInput;
  filterQuery: ESQuery | undefined;
}

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: number;
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: T;
      _version?: number;
      _explanation?: Explanation;
      fields?: string[];
      // tslint:disable-next-line:no-any
      highlight?: any;
      // tslint:disable-next-line:no-any
      inner_hits?: any;
      matched_queries?: string[];
      sort?: string[];
    }>;
  };
  // tslint:disable-next-line:no-any
  aggregations?: any;
}

export interface ShardsResponse {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

export interface Explanation {
  value: number;
  description: string;
  details: Explanation[];
}

export type SearchHit = SearchResponse<object>['hits']['hits'][0];

export interface EventData extends SearchHit {
  sort: string[];
  _source: {
    // tslint:disable-next-line:no-any
    [field: string]: any;
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { JsonArray, JsonValue } from '@kbn/utility-types';
import { RouteMethod } from '@kbn/core/server';
import { VersionedRouteConfig } from '@kbn/core-http-server';

export interface CallWithRequestParams extends estypes.RequestBase {
  max_concurrent_shard_requests?: number;
  name?: string;
  index?: string | string[];
  ignore_unavailable?: boolean;
  allow_no_indices?: boolean;
  size?: number;
  terminate_after?: number;
  fields?: estypes.Fields;
  path?: string;
  query?: string | object;
  track_total_hits?: boolean | number;
  body?: any;
}

export interface LogsSharedDatabaseResponse {
  took: number;
  timeout: boolean;
}

export interface LogsSharedDatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends LogsSharedDatabaseResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  timed_out: boolean;
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: Hit[];
  };
}

export interface LogsSharedDatabaseMultiResponse<Hit, Aggregation>
  extends LogsSharedDatabaseResponse {
  responses: Array<LogsSharedDatabaseSearchResponse<Hit, Aggregation>>;
}

export interface LogsSharedDatabaseGetIndicesAliasResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
  };
}

export interface LogsSharedDatabaseGetIndicesResponse {
  [indexName: string]: {
    aliases: {
      [aliasName: string]: any;
    };
    mappings: {
      _meta: object;
      dynamic_templates: any[];
      date_detection: boolean;
      properties: {
        [fieldName: string]: any;
      };
    };
    settings: { index: object };
  };
}

export type SearchHit = estypes.SearchHit;

export interface SortedSearchHit extends SearchHit {
  sort: any[];
  _source: {
    [field: string]: JsonValue;
  };
  fields: {
    [field: string]: JsonArray;
  };
}

export type LogsSharedVersionedRouteConfig<Method extends RouteMethod> = {
  method: RouteMethod;
} & VersionedRouteConfig<Method>;

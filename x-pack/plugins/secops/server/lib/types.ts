/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Authentications } from './authentications';
import { ConfigurationAdapter } from './configuration';
import { Events } from './events';
import { FrameworkAdapter, FrameworkRequest } from './framework';
import { Hosts } from './hosts';
import { IndexFields } from './index_fields';
import { KpiNetwork } from './kpi_network';
import { Network } from './network';
import { SourceStatus } from './source_status';
import { SourceConfigurations, Sources } from './sources';
import { UncommonProcesses } from './uncommon_processes';

export * from './hosts';

export interface AppDomainLibs {
  authentications: Authentications;
  events: Events;
  fields: IndexFields;
  hosts: Hosts;
  network: Network;
  kpiNetwork: KpiNetwork;
  uncommonProcesses: UncommonProcesses;
}

export interface AppBackendLibs extends AppDomainLibs {
  configuration: ConfigurationAdapter<Configuration>;
  framework: FrameworkAdapter;
  sources: Sources;
  sourceStatus: SourceStatus;
}

export interface Configuration {
  enabled: boolean;
  query: {
    partitionSize: number;
    partitionFactor: number;
  };
  sources: SourceConfigurations;
}

export interface SecOpsContext {
  req: FrameworkRequest;
}

interface TotalValue {
  value: number;
  relation: string;
}

export interface SearchResponse<T> {
  took: number;
  timed_out: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  hits: {
    total: TotalValue | number;
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DomainsData, IpOverviewData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { Hit, ShardsResponse, TotalValue } from '../types';

export interface IpDetailsAdapter {
  getIpDetails(request: FrameworkRequest, options: RequestBasicOptions): Promise<IpOverviewData>;
  getDomains(request: FrameworkRequest, options: RequestBasicOptions): Promise<DomainsData>;
}

interface ResultHit<T> {
  doc_count: number;
  results: {
    hits: {
      total: TotalValue | number;
      max_score: number | null;
      hits: Array<{
        _source: T;
        sort?: [number];
        _index?: string;
        _type?: string;
        _id?: string;
        _score?: number | null;
      }>;
    };
  };
}

export interface OverviewHit {
  took?: number;
  timed_out?: boolean;
  _scroll_id?: string;
  _shards?: ShardsResponse;
  timeout?: number;
  hits?: {
    total: number;
    hits: Hit[];
  };
  doc_count: number;
  geo: ResultHit<object>;
  host: ResultHit<object>;
  autonomous_system: ResultHit<object>;
  firstSeen: {
    value: number;
    value_as_string: string;
  };
  lastSeen: {
    value: number;
    value_as_string: string;
  };
}

export interface IpOverviewHit {
  aggregations: {
    destination?: OverviewHit;
    source?: OverviewHit;
  };
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number | null;
    hits: [];
  };
  took: number;
  timeout: number;
}

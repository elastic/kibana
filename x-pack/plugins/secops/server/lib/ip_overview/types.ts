/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IpOverviewData } from '../../graphql/types';
import { FrameworkRequest, RequestBasicOptions } from '../framework';
import { Hit, SearchHit, ShardsResponse, TotalValue } from '../types';

export interface IpOverviewAdapter {
  getIpOverview(request: FrameworkRequest, options: RequestBasicOptions): Promise<IpOverviewData>;
}

interface ResultHit<T> {
  doc_count: number;
  results: {
    hits: {
      total: TotalValue | number;
      max_score: number | null;
      hits: Array<{ _source: T }>;
    };
  };
}

export interface OverviewHit {
  took?: number;
  timed_out?: boolean;
  _scroll_id?: string;
  _shards: ShardsResponse;
  timeout?: number;
  hits: {
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

export interface IpOverviewHit extends SearchHit {
  aggregations: {
    destination: OverviewHit;
    source: OverviewHit;
  };
}

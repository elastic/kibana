/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternTitle } from '../kibana';
import { JobId } from './job';
export type DatafeedId = string;

export interface Datafeed {
  datafeed_id: DatafeedId;
  aggregations?: Aggregation;
  aggs?: Aggregation;
  chunking_config?: ChunkingConfig;
  frequency?: string;
  indices: IndexPatternTitle[];
  indexes?: IndexPatternTitle[]; // The datafeed can contain indexes and indices
  job_id: JobId;
  query: object;
  query_delay?: string;
  script_fields?: Record<string, any>;
  scroll_size?: number;
  delayed_data_check_config?: object;
  indices_options?: IndicesOptions;
}

export interface ChunkingConfig {
  mode: 'auto' | 'manual' | 'off';
  time_span?: string;
}

export type Aggregation = Record<
  string,
  {
    date_histogram: {
      field: string;
      fixed_interval: string;
    };
    aggregations?: { [key: string]: any };
    aggs?: { [key: string]: any };
  }
>;

interface IndicesOptions {
  expand_wildcards?: 'all' | 'open' | 'closed' | 'hidden' | 'none';
  ignore_unavailable?: boolean;
  allow_no_indices?: boolean;
  ignore_throttled?: boolean;
}

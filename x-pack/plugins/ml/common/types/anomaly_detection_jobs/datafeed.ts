/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
export type DatafeedId = string;

export type Datafeed = estypes.Datafeed;

export type ChunkingConfig = estypes.ChunkingConfig;

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

export type IndicesOptions = estypes.IndicesOptions;

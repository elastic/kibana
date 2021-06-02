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

export type Aggregation = Record<string, estypes.AggregationContainer>;

// export type IndicesOptions = estypes.IndicesOptions;
export interface IndicesOptions {
  allow_no_indices?: boolean;
  expand_wildcards?: estypes.ExpandWildcards;
  ignore_unavailable?: boolean;
}

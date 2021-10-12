/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import type { TimeBucketsInterval } from '../services/time_buckets';
import type { RuntimeField } from '../../../../../src/plugins/data/common';
import { FieldStats } from '../../public/application/index_data_visualizer/types/field_stats';

export interface FieldStatsCommonRequestParams {
  index: string;
  samplerShardSize: number;
  timeFieldName?: string;
  earliestMs?: number | undefined;
  latestMs?: number | undefined;
  runtimeFieldMap?: Record<string, RuntimeField>;
  intervalMs?: number;
  query: estypes.QueryDslQueryContainer;
}

export interface OverallStatsSearchStrategyParams {
  sessionId?: string;
  earliest?: number;
  latest?: number;
  aggInterval: TimeBucketsInterval;
  intervalMs?: number;
  searchQuery?: any;
  samplerShardSize: number;
  index: string;
  timeFieldName?: string;
  runtimeFieldMap: Record<string, RuntimeField>;
  aggregatableFields: string[];
  nonAggregatableFields: string[];
}

export interface FieldStatsSearchStrategyReturnBase {
  progress: FieldStatsSearchStrategyProgress;
  fieldStats: Map<string, FieldStats> | undefined;
  startFetch: () => void;
  cancelFetch: () => void;
}

export interface FieldStatsSearchStrategyProgress {
  error?: Error;
  isRunning: boolean;
  loaded: number;
  total: number;
}

export interface FieldData {
  fieldName: string;
  existsInDocs: boolean;
  stats?: {
    sampleCount?: number;
    count?: number;
    cardinality?: number;
  };
}

export interface Field {
  fieldName: string;
  type: string;
  cardinality: number;
  safeFieldName: string;
}

export interface Aggs {
  [key: string]: any;
}

export interface FieldAggCardinality {
  field: string;
  percent?: any;
}

export interface ScriptAggCardinality {
  script: any;
}

export interface AggCardinality {
  cardinality: FieldAggCardinality | ScriptAggCardinality;
}

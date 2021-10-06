/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../src/plugins/data/common';
import type { TimeBucketsInterval } from '../services/time_buckets';
import type { RuntimeField } from '../../../../../src/plugins/data/common';
import type { FieldRequestConfig } from '../types';
import type { ISearchStrategy } from '../../../../../src/plugins/data/server';
import { isPopulatedObject } from '../utils/object_utils';
import { FieldStats } from '../../server/types';

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

export interface FieldStatsSearchStrategyParams {
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
  metricConfigs: FieldRequestConfig[];
  nonMetricConfigs: FieldRequestConfig[];
}

export function isFieldStatsSearchStrategyParams(
  arg: unknown
): arg is FieldStatsSearchStrategyParams {
  return isPopulatedObject(arg, ['index', 'samplerShardSize', 'metricConfigs', 'nonMetricConfigs']);
}

export interface FieldStatRawResponse {
  loading?: boolean;
  ccsWarning: boolean;
  took: 0;
  fieldStats: Record<string, FieldStats>;
}
export type FieldStatsRequest = IKibanaSearchRequest<FieldStatsSearchStrategyParams>;
export type FieldStatsResponse = IKibanaSearchResponse<FieldStatRawResponse>;

export interface FieldStatsSearchStrategyReturnBase<TRawResponse extends FieldStatRawResponse> {
  progress: FieldStatsSearchStrategyProgress;
  response: TRawResponse;
  startFetch: () => void;
  cancelFetch: () => void;
}

export interface FieldStatsSearchStrategyProgress {
  error?: Error;
  isRunning: boolean;
  loaded: number;
  total: number;
}

export type FieldStatsSearchStrategy = ISearchStrategy<FieldStatsRequest, FieldStatsResponse>;

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

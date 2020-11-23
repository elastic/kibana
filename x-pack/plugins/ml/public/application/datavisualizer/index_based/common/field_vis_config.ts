/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ML_JOB_FIELD_TYPES } from '../../../../../common/constants/field_types';

export interface Percentile {
  percent: number;
  minValue: number;
  maxValue: number;
}

export interface MetricFieldVisStats {
  avg?: number;
  distribution?: {
    percentiles: Percentile[];
    maxPercentile: number;
    minPercentile: 0;
  };
  max?: number;
  median?: number;
  min?: number;
}

export interface FieldVisStats {
  cardinality?: number;
  count?: number;
  sampleCount?: number;
  avg?: number;
  distribution?: {
    percentiles: Percentile[];
    maxPercentile: number;
    minPercentile: 0;
  };
  fieldName?: string;
  isTopValuesSampled?: boolean;
  max?: number;
  median?: number;
  min?: number;
  topValues?: Array<{ key: number; doc_count: number }>;
  topValuesSampleSize?: number;
  topValuesSamplerShardSize?: number;
  examples?: Array<string | object>;
}

// The internal representation of the configuration used to build the visuals
// which display the field information.
// TODO - type stats
export interface FieldVisConfig {
  type: ML_JOB_FIELD_TYPES;
  fieldName?: string;
  existsInDocs: boolean;
  aggregatable: boolean;
  loading: boolean;
  stats?: FieldVisStats;
  fieldFormat?: any;
  isUnsupportedType?: boolean;
}

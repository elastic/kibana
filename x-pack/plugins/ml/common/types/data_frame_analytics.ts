/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RuntimeMappings } from './fields';

import { EsErrorBody } from '../util/errors';
import { ANALYSIS_CONFIG_TYPE } from '../constants/data_frame_analytics';
import { DATA_FRAME_TASK_STATE } from '../constants/data_frame_analytics';

export interface DeleteDataFrameAnalyticsWithIndexStatus {
  success: boolean;
  error?: EsErrorBody | Boom.Boom;
}

export type IndexName = string;
export type DataFrameAnalyticsId = string;

export interface OutlierAnalysis {
  [key: string]: {};

  outlier_detection: {
    compute_feature_influence?: boolean;
  };
}

interface Regression {
  dependent_variable: string;
  training_percent: number;
  num_top_feature_importance_values?: number;
  prediction_field_name?: string;
}

interface Classification {
  class_assignment_objective?: string;
  dependent_variable: string;
  training_percent: number;
  num_top_classes?: number;
  num_top_feature_importance_values?: number;
  prediction_field_name?: string;
}

export interface RegressionAnalysis {
  [key: string]: Regression;

  regression: Regression;
}

export interface ClassificationAnalysis {
  [key: string]: Classification;

  classification: Classification;
}

interface GenericAnalysis {
  [key: string]: Record<string, any>;
}

export type AnalysisConfig =
  | OutlierAnalysis
  | RegressionAnalysis
  | ClassificationAnalysis
  | GenericAnalysis;

export interface DataFrameAnalyticsConfig {
  id: DataFrameAnalyticsId;
  description?: string;
  dest: {
    index: IndexName;
    results_field: string;
  };
  source: {
    index: IndexName | IndexName[];
    query?: estypes.QueryDslQueryContainer;
    runtime_mappings?: RuntimeMappings;
  };
  analysis: AnalysisConfig;
  analyzed_fields?: {
    includes?: string[];
    excludes?: string[];
  };
  model_memory_limit: string;
  max_num_threads?: number;
  create_time: number;
  version: string;
  allow_lazy_start?: boolean;
}

export type DataFrameAnalysisConfigType =
  typeof ANALYSIS_CONFIG_TYPE[keyof typeof ANALYSIS_CONFIG_TYPE];

export type DataFrameTaskStateType =
  typeof DATA_FRAME_TASK_STATE[keyof typeof DATA_FRAME_TASK_STATE];

interface ProgressSection {
  phase: string;
  progress_percent: number;
}

export interface DataFrameAnalyticsStats {
  assignment_explanation?: string;
  id: DataFrameAnalyticsId;
  memory_usage?: {
    timestamp?: string;
    peak_usage_bytes: number;
    status: string;
  };
  node?: {
    attributes: Record<string, any>;
    ephemeral_id: string;
    id: string;
    name: string;
    transport_address: string;
  };
  progress: ProgressSection[];
  failure_reason?: string;
  state: DataFrameTaskStateType;
}

export interface AnalyticsMapNodeElement {
  data: {
    id: string;
    label: string;
    type: string;
    analysisType?: string;
  };
}

export interface AnalyticsMapEdgeElement {
  data: {
    id: string;
    source: string;
    target: string;
  };
}

export type MapElements = AnalyticsMapNodeElement | AnalyticsMapEdgeElement;
export interface AnalyticsMapReturnType {
  elements: MapElements[];
  details: Record<string, any>; // transform, job, or index details
  error: null | any;
}

export interface FeatureProcessor {
  frequency_encoding: {
    feature_name: string;
    field: string;
    frequency_map: Record<string, any>;
  };
  multi_encoding: {
    processors: any[];
  };
  n_gram_encoding: {
    feature_prefix?: string;
    field: string;
    length?: number;
    n_grams: number[];
    start?: number;
  };
  one_hot_encoding: {
    field: string;
    hot_map: string;
  };
  target_mean_encoding: {
    default_value: number;
    feature_name: string;
    field: string;
    target_map: Record<string, any>;
  };
}

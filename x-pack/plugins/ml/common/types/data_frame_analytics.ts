/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomHttpResponseOptions, ResponseError } from 'kibana/server';

export interface DeleteDataFrameAnalyticsWithIndexStatus {
  success: boolean;
  error?: CustomHttpResponseOptions<ResponseError>;
}

export type IndexName = string;
export type DataFrameAnalyticsId = string;

export interface OutlierAnalysis {
  [key: string]: {};

  outlier_detection: {};
}

interface Regression {
  dependent_variable: string;
  training_percent?: number;
  num_top_feature_importance_values?: number;
  prediction_field_name?: string;
}

interface Classification {
  dependent_variable: string;
  training_percent?: number;
  num_top_classes?: string;
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
    query?: any;
  };
  analysis: AnalysisConfig;
  analyzed_fields: {
    includes: string[];
    excludes: string[];
  };
  model_memory_limit: string;
  max_num_threads?: number;
  create_time: number;
  version: string;
  allow_lazy_start?: boolean;
}

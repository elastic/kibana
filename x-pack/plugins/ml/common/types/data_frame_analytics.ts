/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { EsErrorBody } from '../util/errors';
import { ANALYSIS_CONFIG_TYPE } from '../constants/data_frame_analytics';

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

export type AnalysisConfig = estypes.MlDataframeAnalysisContainer;
export interface DataFrameAnalyticsConfig
  extends Omit<estypes.MlDataframeAnalyticsSummary, 'analyzed_fields'> {
  analyzed_fields?: estypes.MlDataframeAnalysisAnalyzedFields;
}

export type DataFrameAnalysisConfigType =
  typeof ANALYSIS_CONFIG_TYPE[keyof typeof ANALYSIS_CONFIG_TYPE];

export type DataFrameTaskStateType = estypes.MlDataframeState | 'analyzing' | 'reindexing';

export interface DataFrameAnalyticsStats extends Omit<estypes.MlDataframeAnalytics, 'state'> {
  failure_reason?: string;
  state: DataFrameTaskStateType;
}

export type DfAnalyticsExplainResponse = estypes.MlExplainDataFrameAnalyticsResponse;

export interface FieldSelectionItem
  extends Omit<estypes.MlDataframeAnalyticsFieldSelection, 'mapping_types'> {
  mapping_types?: string[];
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

export type FeatureProcessor = estypes.MlDataframeAnalysisFeatureProcessor;

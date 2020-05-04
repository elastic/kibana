/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';
import { BehaviorSubject } from 'rxjs';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { cloneDeep } from 'lodash';
import { ml } from '../../services/ml_api_service';
import { Dictionary } from '../../../../common/types/common';
import { getErrorMessage } from '../../../../common/util/errors';
import { SavedSearchQuery } from '../../contexts/ml';

export type IndexName = string;
export type IndexPattern = string;
export type DataFrameAnalyticsId = string;

export enum ANALYSIS_CONFIG_TYPE {
  OUTLIER_DETECTION = 'outlier_detection',
  REGRESSION = 'regression',
  CLASSIFICATION = 'classification',
}

interface OutlierAnalysis {
  [key: string]: {};
  outlier_detection: {};
}

interface Regression {
  dependent_variable: string;
  training_percent?: number;
  num_top_feature_importance_values?: number;
  prediction_field_name?: string;
}
export interface RegressionAnalysis {
  [key: string]: Regression;
  regression: Regression;
}

interface Classification {
  dependent_variable: string;
  training_percent?: number;
  num_top_classes?: string;
  num_top_feature_importance_values?: number;
  prediction_field_name?: string;
}
export interface ClassificationAnalysis {
  [key: string]: Classification;
  classification: Classification;
}

export interface LoadExploreDataArg {
  filterByIsTraining?: boolean;
  searchQuery: SavedSearchQuery;
}

export const SEARCH_SIZE = 1000;

export const TRAINING_PERCENT_MIN = 1;
export const TRAINING_PERCENT_MAX = 100;

export const NUM_TOP_FEATURE_IMPORTANCE_VALUES_MIN = 0;

export const defaultSearchQuery = {
  match_all: {},
};

export interface SearchQuery {
  track_total_hits?: boolean;
  query: SavedSearchQuery;
  sort?: any;
}

export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

export interface FieldSelectionItem {
  name: string;
  mappings_types: string[];
  is_included: boolean;
  is_required: boolean;
  feature_type?: string;
  reason?: string;
}

export interface DfAnalyticsExplainResponse {
  field_selection: FieldSelectionItem[];
  memory_estimation: {
    expected_memory_without_disk: string;
    expected_memory_with_disk: string;
  };
}

export interface Eval {
  meanSquaredError: number | string;
  rSquared: number | string;
  error: null | string;
}

export interface RegressionEvaluateResponse {
  regression: {
    mean_squared_error: {
      error: number;
    };
    r_squared: {
      value: number;
    };
  };
}

export interface PredictedClass {
  predicted_class: string;
  count: number;
}

export interface ConfusionMatrix {
  actual_class: string;
  actual_class_doc_count: number;
  predicted_classes: PredictedClass[];
  other_predicted_class_doc_count: number;
}

export interface ClassificationEvaluateResponse {
  classification: {
    multiclass_confusion_matrix: {
      confusion_matrix: ConfusionMatrix[];
    };
  };
}

interface GenericAnalysis {
  [key: string]: Record<string, any>;
}

interface LoadEvaluateResult {
  success: boolean;
  eval: RegressionEvaluateResponse | ClassificationEvaluateResponse | null;
  error: string | null;
}

type AnalysisConfig =
  | OutlierAnalysis
  | RegressionAnalysis
  | ClassificationAnalysis
  | GenericAnalysis;

export const getAnalysisType = (analysis: AnalysisConfig): string => {
  const keys = Object.keys(analysis);

  if (keys.length === 1) {
    return keys[0];
  }

  return 'unknown';
};

export const getDependentVar = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['dependent_variable']
  | ClassificationAnalysis['classification']['dependent_variable'] => {
  let depVar = '';

  if (isRegressionAnalysis(analysis)) {
    depVar = analysis.regression.dependent_variable;
  }

  if (isClassificationAnalysis(analysis)) {
    depVar = analysis.classification.dependent_variable;
  }
  return depVar;
};

export const getTrainingPercent = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['training_percent']
  | ClassificationAnalysis['classification']['training_percent'] => {
  let trainingPercent;

  if (isRegressionAnalysis(analysis)) {
    trainingPercent = analysis.regression.training_percent;
  }

  if (isClassificationAnalysis(analysis)) {
    trainingPercent = analysis.classification.training_percent;
  }
  return trainingPercent;
};

export const getPredictionFieldName = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['prediction_field_name']
  | ClassificationAnalysis['classification']['prediction_field_name'] => {
  // If undefined will be defaulted to dependent_variable when config is created
  let predictionFieldName;
  if (isRegressionAnalysis(analysis) && analysis.regression.prediction_field_name !== undefined) {
    predictionFieldName = analysis.regression.prediction_field_name;
  } else if (
    isClassificationAnalysis(analysis) &&
    analysis.classification.prediction_field_name !== undefined
  ) {
    predictionFieldName = analysis.classification.prediction_field_name;
  }
  return predictionFieldName;
};

export const getNumTopFeatureImportanceValues = (
  analysis: AnalysisConfig
):
  | RegressionAnalysis['regression']['num_top_feature_importance_values']
  | ClassificationAnalysis['classification']['num_top_feature_importance_values'] => {
  let numTopFeatureImportanceValues;
  if (
    isRegressionAnalysis(analysis) &&
    analysis.regression.num_top_feature_importance_values !== undefined
  ) {
    numTopFeatureImportanceValues = analysis.regression.num_top_feature_importance_values;
  } else if (
    isClassificationAnalysis(analysis) &&
    analysis.classification.num_top_feature_importance_values !== undefined
  ) {
    numTopFeatureImportanceValues = analysis.classification.num_top_feature_importance_values;
  }
  return numTopFeatureImportanceValues;
};

export const getPredictedFieldName = (
  resultsField: string,
  analysis: AnalysisConfig,
  forSort?: boolean
) => {
  // default is 'ml'
  const predictionFieldName = getPredictionFieldName(analysis);
  const defaultPredictionField = `${getDependentVar(analysis)}_prediction`;
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }`;
  return predictedField;
};

export const isOutlierAnalysis = (arg: any): arg is OutlierAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.OUTLIER_DETECTION;
};

export const isRegressionAnalysis = (arg: any): arg is RegressionAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION;
};

export const isClassificationAnalysis = (arg: any): arg is ClassificationAnalysis => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION;
};

export const isResultsSearchBoolQuery = (arg: any): arg is ResultsSearchBoolQuery => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === 'bool';
};

export const isQueryStringQuery = (arg: any): arg is QueryStringQuery => {
  const keys = Object.keys(arg);
  return keys.length === 1 && keys[0] === 'query_string';
};

export const isRegressionEvaluateResponse = (arg: any): arg is RegressionEvaluateResponse => {
  const keys = Object.keys(arg);
  return (
    keys.length === 1 &&
    keys[0] === ANALYSIS_CONFIG_TYPE.REGRESSION &&
    arg?.regression?.mean_squared_error !== undefined &&
    arg?.regression?.r_squared !== undefined
  );
};

export const isClassificationEvaluateResponse = (
  arg: any
): arg is ClassificationEvaluateResponse => {
  const keys = Object.keys(arg);
  return (
    keys.length === 1 &&
    keys[0] === ANALYSIS_CONFIG_TYPE.CLASSIFICATION &&
    arg?.classification?.multiclass_confusion_matrix !== undefined
  );
};

export interface DataFrameAnalyticsConfig {
  id: DataFrameAnalyticsId;
  // Description attribute is not supported yet
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
  create_time: number;
  version: string;
  allow_lazy_start?: boolean;
}

export enum REFRESH_ANALYTICS_LIST_STATE {
  ERROR = 'error',
  IDLE = 'idle',
  LOADING = 'loading',
  REFRESH = 'refresh',
}
export const refreshAnalyticsList$ = new BehaviorSubject<REFRESH_ANALYTICS_LIST_STATE>(
  REFRESH_ANALYTICS_LIST_STATE.IDLE
);

export const useRefreshAnalyticsList = (
  callback: {
    isLoading?(d: boolean): void;
    onRefresh?(): void;
  } = {}
) => {
  useEffect(() => {
    const distinct$ = refreshAnalyticsList$.pipe(distinctUntilChanged());

    const subscriptions: Subscription[] = [];

    if (typeof callback.onRefresh === 'function') {
      // initial call to refresh
      callback.onRefresh();

      subscriptions.push(
        distinct$
          .pipe(filter(state => state === REFRESH_ANALYTICS_LIST_STATE.REFRESH))
          .subscribe(() => typeof callback.onRefresh === 'function' && callback.onRefresh())
      );
    }

    if (typeof callback.isLoading === 'function') {
      subscriptions.push(
        distinct$.subscribe(
          state =>
            typeof callback.isLoading === 'function' &&
            callback.isLoading(state === REFRESH_ANALYTICS_LIST_STATE.LOADING)
        )
      );
    }

    return () => {
      subscriptions.map(sub => sub.unsubscribe());
    };
  }, []);

  return {
    refresh: () => {
      // A refresh is followed immediately by setting the state to loading
      // to trigger data fetching and loading indicators in one go.
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.REFRESH);
      refreshAnalyticsList$.next(REFRESH_ANALYTICS_LIST_STATE.LOADING);
    },
  };
};

const DEFAULT_SIG_FIGS = 3;

export function getValuesFromResponse(response: RegressionEvaluateResponse) {
  let meanSquaredError = response?.regression?.mean_squared_error?.error;

  if (meanSquaredError) {
    meanSquaredError = Number(meanSquaredError.toPrecision(DEFAULT_SIG_FIGS));
  }

  let rSquared = response?.regression?.r_squared?.value;
  if (rSquared) {
    rSquared = Number(rSquared.toPrecision(DEFAULT_SIG_FIGS));
  }

  return { meanSquaredError, rSquared };
}
interface ResultsSearchBoolQuery {
  bool: Dictionary<any>;
}
interface ResultsSearchTermQuery {
  term: Dictionary<any>;
}

interface QueryStringQuery {
  query_string: Dictionary<any>;
}

export type ResultsSearchQuery = ResultsSearchBoolQuery | ResultsSearchTermQuery | SavedSearchQuery;

export function getEvalQueryBody({
  resultsField,
  isTraining,
  searchQuery,
  ignoreDefaultQuery,
}: {
  resultsField: string;
  isTraining?: boolean;
  searchQuery?: ResultsSearchQuery;
  ignoreDefaultQuery?: boolean;
}) {
  let query: any;

  const trainingQuery: ResultsSearchQuery = {
    term: { [`${resultsField}.is_training`]: { value: isTraining } },
  };

  const searchQueryClone = cloneDeep(searchQuery);

  if (isResultsSearchBoolQuery(searchQueryClone)) {
    if (searchQueryClone.bool.must === undefined) {
      searchQueryClone.bool.must = [];
    }

    if (isTraining !== undefined) {
      searchQueryClone.bool.must.push(trainingQuery);
    }

    query = searchQueryClone;
  } else if (isQueryStringQuery(searchQueryClone)) {
    query = {
      bool: {
        must: [searchQueryClone],
      },
    };
    if (isTraining !== undefined) {
      query.bool.must.push(trainingQuery);
    }
  } else {
    // Not a bool or string query so we need to create it so can add the trainingQuery
    query = {
      bool: {
        must: isTraining !== undefined ? [trainingQuery] : [],
      },
    };
  }
  return query;
}

interface EvaluateMetrics {
  classification: {
    multiclass_confusion_matrix: object;
  };
  regression: {
    r_squared: object;
    mean_squared_error: object;
  };
}

interface LoadEvalDataConfig {
  isTraining?: boolean;
  index: string;
  dependentVariable: string;
  resultsField: string;
  predictionFieldName?: string;
  searchQuery?: ResultsSearchQuery;
  ignoreDefaultQuery?: boolean;
  jobType: ANALYSIS_CONFIG_TYPE;
  requiresKeyword?: boolean;
}

export const loadEvalData = async ({
  isTraining,
  index,
  dependentVariable,
  resultsField,
  predictionFieldName,
  searchQuery,
  ignoreDefaultQuery,
  jobType,
  requiresKeyword,
}: LoadEvalDataConfig) => {
  const results: LoadEvaluateResult = { success: false, eval: null, error: null };
  const defaultPredictionField = `${dependentVariable}_prediction`;
  let predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }`;

  if (jobType === ANALYSIS_CONFIG_TYPE.CLASSIFICATION && requiresKeyword === true) {
    predictedField = `${predictedField}.keyword`;
  }

  const query = getEvalQueryBody({ resultsField, isTraining, searchQuery, ignoreDefaultQuery });

  const metrics: EvaluateMetrics = {
    classification: {
      multiclass_confusion_matrix: {},
    },
    regression: {
      r_squared: {},
      mean_squared_error: {},
    },
  };

  const config = {
    index,
    query,
    evaluation: {
      [jobType]: {
        actual_field: dependentVariable,
        predicted_field: predictedField,
        metrics: metrics[jobType as keyof EvaluateMetrics],
      },
    },
  };

  try {
    const evalResult = await ml.dataFrameAnalytics.evaluateDataFrameAnalytics(config);
    results.success = true;
    results.eval = evalResult;
    return results;
  } catch (e) {
    results.error = getErrorMessage(e);
    return results;
  }
};

interface TrackTotalHitsSearchResponse {
  hits: {
    total: {
      value: number;
      relation: string;
    };
    hits: any[];
  };
}

interface LoadDocsCountConfig {
  ignoreDefaultQuery?: boolean;
  isTraining?: boolean;
  searchQuery: SavedSearchQuery;
  resultsField: string;
  destIndex: string;
}

interface LoadDocsCountResponse {
  docsCount: number | null;
  success: boolean;
}

export const loadDocsCount = async ({
  ignoreDefaultQuery = true,
  isTraining,
  searchQuery,
  resultsField,
  destIndex,
}: LoadDocsCountConfig): Promise<LoadDocsCountResponse> => {
  const query = getEvalQueryBody({ resultsField, isTraining, ignoreDefaultQuery, searchQuery });

  try {
    const body: SearchQuery = {
      track_total_hits: true,
      query,
    };

    const resp: TrackTotalHitsSearchResponse = await ml.esSearch({
      index: destIndex,
      size: 0,
      body,
    });

    const docsCount = resp.hits.total && resp.hits.total.value;
    return { docsCount, success: docsCount !== undefined };
  } catch (e) {
    return {
      docsCount: null,
      success: false,
    };
  }
};

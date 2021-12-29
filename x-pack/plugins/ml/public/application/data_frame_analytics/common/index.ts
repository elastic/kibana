/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  UpdateDataFrameAnalyticsConfig,
  IndexPattern,
  RegressionEvaluateResponse,
  Eval,
  SearchQuery,
} from './analytics';
export {
  getAnalysisType,
  getDependentVar,
  getPredictionFieldName,
  getDefaultTrainingFilterQuery,
  isOutlierAnalysis,
  refreshAnalyticsList$,
  useRefreshAnalyticsList,
  REFRESH_ANALYTICS_LIST_STATE,
  OUTLIER_ANALYSIS_METHOD,
  getValuesFromResponse,
  loadEvalData,
  loadDocsCount,
  getPredictedFieldName,
  INDEX_STATUS,
  SEARCH_SIZE,
  defaultSearchQuery,
  ANALYSIS_CONFIG_TYPE,
} from './analytics';

export type { EsId, EsDoc, EsDocSource, EsFieldName } from './fields';
export { getDefaultFieldsFromJobCaps, sortExplorationResultsFields, MAX_COLUMNS } from './fields';

export { getIndexData } from './get_index_data';
export { getIndexFields } from './get_index_fields';
export { getScatterplotMatrixLegendType } from './get_scatterplot_matrix_legend_type';

export { useResultsViewConfig } from './use_results_view_config';
export type { DataFrameAnalyticsConfig } from '../../../../common/types/data_frame_analytics';
export type { DataFrameAnalyticsId } from '../../../../common/types/data_frame_analytics';
export type { IndexName } from '../../../../common/types/data_frame_analytics';

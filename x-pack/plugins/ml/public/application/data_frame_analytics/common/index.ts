/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { IndexPattern, RegressionEvaluateResponse, Eval, SearchQuery } from './analytics';
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

export { getIndexData } from './get_index_data';
export { getIndexFields } from './get_index_fields';
export { getDestinationIndex } from './get_destination_index';
export { getScatterplotMatrixLegendType } from './get_scatterplot_matrix_legend_type';

export { useResultsViewConfig } from './use_results_view_config';

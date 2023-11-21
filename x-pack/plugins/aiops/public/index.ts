/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AiopsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new AiopsPlugin();
}

export type { AiopsAppDependencies } from './hooks/use_aiops_app_context';
export type { LogRateAnalysisAppStateProps } from './components/log_rate_analysis';
export type { LogRateAnalysisContentWrapperProps } from './components/log_rate_analysis/log_rate_analysis_content/log_rate_analysis_content_wrapper';
export type { LogCategorizationAppStateProps } from './components/log_categorization';
export type { ChangePointDetectionAppStateProps } from './components/change_point_detection';
export type { LogRateAnalysisResultsData } from './components/log_rate_analysis/log_rate_analysis_results';

export type { ChangePointType } from './components/change_point_detection/constants';

export {
  LogRateAnalysis,
  LogRateAnalysisContent,
  LogCategorization,
  ChangePointDetection,
} from './shared_lazy_components';

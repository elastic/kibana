/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis';

import { kibanaLogsDataViewTestData } from './log_rate_analysis/test_data/kibana_logs_data_view_test_data';
import { farequoteDataViewTestData } from './log_rate_analysis/test_data/farequote_data_view_test_data';
import { farequoteDataViewTestDataWithQuery } from './log_rate_analysis/test_data/farequote_data_view_test_data_with_query';
import { getArtificialLogDataViewTestData } from './log_rate_analysis/test_data/artificial_log_data_view_test_data';

import type { TestData } from './types';

export const logRateAnalysisTestData: TestData[] = [
  kibanaLogsDataViewTestData,
  farequoteDataViewTestData,
  farequoteDataViewTestDataWithQuery,
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
    textField: false,
    zeroDocsFallback: false,
    autoRun: false,
  }),
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
    textField: true,
    zeroDocsFallback: false,
    autoRun: false,
  }),
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.DIP,
    textField: false,
    zeroDocsFallback: false,
    autoRun: false,
  }),
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.DIP,
    textField: true,
    zeroDocsFallback: false,
    autoRun: false,
  }),
  // For the zero docs fallback data sets the `change_point` aggregation reports a `trend_change`
  // at the first non-empty bucket. Extending that change point covers every bucket with documents,
  // so clicking any bar in the chart lands inside the change point and auto-runs the analysis.
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
    textField: true,
    zeroDocsFallback: true,
    autoRun: true,
  }),
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.SPIKE,
    textField: false,
    zeroDocsFallback: true,
    autoRun: true,
  }),
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.DIP,
    textField: true,
    zeroDocsFallback: true,
    autoRun: true,
  }),
  getArtificialLogDataViewTestData({
    analysisType: LOG_RATE_ANALYSIS_TYPE.DIP,
    textField: false,
    zeroDocsFallback: true,
    autoRun: true,
  }),
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultAiOpsListState, type AiOpsFullIndexBasedAppState } from './common';

export interface LogRateAnalysisPageUrlState {
  pageKey: 'logRateAnalysis';
  pageUrlState: LogRateAnalysisAppState;
}

export interface LogRateAnalysisAppState extends AiOpsFullIndexBasedAppState {
  /** Window parameters */
  wp?: {
    /** Baseline minimum value */
    bMin: number;
    /** Baseline maximum value */
    bMax: number;
    /** Deviation minimum value */
    dMin: number;
    /** Deviation maximum value */
    dMax: number;
  };
}

export const getDefaultLogRateAnalysisAppState = (
  overrides?: Partial<LogRateAnalysisAppState>
): LogRateAnalysisAppState => {
  return {
    wp: undefined,
    ...getDefaultAiOpsListState(overrides),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTerm, SignificantTermGroup } from '@kbn/ml-agg-utils';

import { API_ACTION_NAME, AiopsLogRateAnalysisApiAction } from './log_rate_analysis';

interface StreamState {
  ccsWarning: boolean;
  significantTerms: SignificantTerm[];
  significantTermsGroups: SignificantTermGroup[];
  errors: string[];
  loaded: number;
  loadingState: string;
  remainingFieldCandidates?: string[];
  groupsMissing?: boolean;
}

export const initialState: StreamState = {
  ccsWarning: false,
  significantTerms: [],
  significantTermsGroups: [],
  errors: [],
  loaded: 0,
  loadingState: '',
};

export function streamReducer(
  state: StreamState,
  action: AiopsLogRateAnalysisApiAction | AiopsLogRateAnalysisApiAction[]
): StreamState {
  if (Array.isArray(action)) {
    return action.reduce(streamReducer, state);
  }

  switch (action.type) {
    case API_ACTION_NAME.ADD_SIGNIFICANT_TERMS:
      return { ...state, significantTerms: [...state.significantTerms, ...action.payload] };
    case API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM:
      const significantTerms = state.significantTerms.map((cp) => {
        const cpHistogram = action.payload.find(
          (h) => h.fieldName === cp.fieldName && h.fieldValue === cp.fieldValue
        );
        if (cpHistogram) {
          cp.histogram = cpHistogram.histogram;
        }
        return cp;
      });
      return { ...state, significantTerms };
    case API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP:
      return { ...state, significantTermsGroups: action.payload };
    case API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM:
      const significantTermsGroups = state.significantTermsGroups.map((cpg) => {
        const cpHistogram = action.payload.find((h) => h.id === cpg.id);
        if (cpHistogram) {
          cpg.histogram = cpHistogram.histogram;
        }
        return cpg;
      });
      return { ...state, significantTermsGroups };
    case API_ACTION_NAME.ADD_ERROR:
      return { ...state, errors: [...state.errors, action.payload] };
    case API_ACTION_NAME.RESET_ERRORS:
      return { ...state, errors: [] };
    case API_ACTION_NAME.RESET_GROUPS:
      return { ...state, significantTermsGroups: [] };
    case API_ACTION_NAME.RESET_ALL:
      return initialState;
    case API_ACTION_NAME.UPDATE_LOADING_STATE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

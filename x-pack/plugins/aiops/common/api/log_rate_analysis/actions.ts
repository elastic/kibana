/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantTerm,
  SignificantTermHistogram,
  SignificantTermGroup,
  SignificantTermGroupHistogram,
} from '@kbn/ml-agg-utils';

export const API_ACTION_NAME = {
  ADD_SIGNIFICANT_TERMS: 'add_significant_terms',
  ADD_SIGNIFICANT_TERMS_HISTOGRAM: 'add_significant_terms_histogram',
  ADD_SIGNIFICANT_TERMS_GROUP: 'add_significant_terms_group',
  ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM: 'add_significant_terms_group_histogram',
  ADD_ERROR: 'add_error',
  PING: 'ping',
  RESET_ALL: 'reset_all',
  RESET_ERRORS: 'reset_errors',
  RESET_GROUPS: 'reset_groups',
  UPDATE_LOADING_STATE: 'update_loading_state',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionAddSignificantTerms {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS;
  payload: SignificantTerm[];
}

export function addSignificantTermsAction(
  payload: ApiActionAddSignificantTerms['payload']
): ApiActionAddSignificantTerms {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS,
    payload,
  };
}

interface ApiActionAddSignificantTermsHistogram {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM;
  payload: SignificantTermHistogram[];
}

export function addSignificantTermsHistogramAction(
  payload: ApiActionAddSignificantTermsHistogram['payload']
): ApiActionAddSignificantTermsHistogram {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM,
    payload,
  };
}

interface ApiActionAddSignificantTermsGroup {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP;
  payload: SignificantTermGroup[];
}

export function addSignificantTermsGroupAction(
  payload: ApiActionAddSignificantTermsGroup['payload']
) {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP,
    payload,
  };
}

interface ApiActionAddSignificantTermsGroupHistogram {
  type: typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM;
  payload: SignificantTermGroupHistogram[];
}

export function addSignificantTermsGroupHistogramAction(
  payload: ApiActionAddSignificantTermsGroupHistogram['payload']
): ApiActionAddSignificantTermsGroupHistogram {
  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM,
    payload,
  };
}

interface ApiActionAddError {
  type: typeof API_ACTION_NAME.ADD_ERROR;
  payload: string;
}

export function addErrorAction(payload: ApiActionAddError['payload']): ApiActionAddError {
  return {
    type: API_ACTION_NAME.ADD_ERROR,
    payload,
  };
}

interface ApiActionResetErrors {
  type: typeof API_ACTION_NAME.RESET_ERRORS;
}

export function resetErrorsAction() {
  return {
    type: API_ACTION_NAME.RESET_ERRORS,
  };
}

interface ApiActionPing {
  type: typeof API_ACTION_NAME.PING;
}

export function pingAction(): ApiActionPing {
  return { type: API_ACTION_NAME.PING };
}

interface ApiActionResetAll {
  type: typeof API_ACTION_NAME.RESET_ALL;
}

export function resetAllAction(): ApiActionResetAll {
  return { type: API_ACTION_NAME.RESET_ALL };
}

interface ApiActionResetGroups {
  type: typeof API_ACTION_NAME.RESET_GROUPS;
}

export function resetGroupsAction(): ApiActionResetGroups {
  return { type: API_ACTION_NAME.RESET_GROUPS };
}

interface ApiActionUpdateLoadingState {
  type: typeof API_ACTION_NAME.UPDATE_LOADING_STATE;
  payload: {
    ccsWarning: boolean;
    loaded: number;
    loadingState: string;
    remainingFieldCandidates?: string[];
    groupsMissing?: boolean;
  };
}

export function updateLoadingStateAction(
  payload: ApiActionUpdateLoadingState['payload']
): ApiActionUpdateLoadingState {
  return {
    type: API_ACTION_NAME.UPDATE_LOADING_STATE,
    payload,
  };
}

export type AiopsLogRateAnalysisApiAction =
  | ApiActionAddSignificantTerms
  | ApiActionAddSignificantTermsGroup
  | ApiActionAddSignificantTermsHistogram
  | ApiActionAddSignificantTermsGroupHistogram
  | ApiActionAddError
  | ApiActionPing
  | ApiActionResetAll
  | ApiActionResetErrors
  | ApiActionResetGroups
  | ApiActionUpdateLoadingState;

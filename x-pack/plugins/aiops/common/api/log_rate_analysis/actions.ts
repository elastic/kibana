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
  ADD_SIGNIFICANT_ITEMS: 'add_significant_items',
  ADD_SIGNIFICANT_ITEMS_HISTOGRAM: 'add_significant_items_histogram',
  ADD_SIGNIFICANT_ITEMS_GROUP: 'add_significant_items_group',
  ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM: 'add_significant_items_group_histogram',
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

type ApiVersion = '1' | '2';

interface ApiActionAddSignificantTerms<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS
    : never;
  payload: SignificantTerm[];
}

export function addSignificantTermsAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantTerms<T>['payload'],
  version: T
): ApiActionAddSignificantTerms<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS,
      payload,
    } as ApiActionAddSignificantTerms<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS,
    payload,
  } as ApiActionAddSignificantTerms<T>;
}

interface ApiActionAddSignificantTermsHistogram<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_HISTOGRAM
    : never;
  payload: SignificantTermHistogram[];
}

export function addSignificantTermsHistogramAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantTermsHistogram<T>['payload'],
  version: T
): ApiActionAddSignificantTermsHistogram<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_HISTOGRAM,
      payload,
    } as ApiActionAddSignificantTermsHistogram<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_HISTOGRAM,
    payload,
  } as ApiActionAddSignificantTermsHistogram<T>;
}

interface ApiActionAddSignificantTermsGroup<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP
    : never;
  payload: SignificantTermGroup[];
}

export function addSignificantTermsGroupAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantTermsGroup<T>['payload'],
  version: T
): ApiActionAddSignificantTermsGroup<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP,
      payload,
    } as ApiActionAddSignificantTermsGroup<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP,
    payload,
  } as ApiActionAddSignificantTermsGroup<T>;
}

interface ApiActionAddSignificantTermsGroupHistogram<T extends ApiVersion> {
  type: T extends '1'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM
    : T extends '2'
    ? typeof API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM
    : never;
  payload: SignificantTermGroupHistogram[];
}

export function addSignificantTermsGroupHistogramAction<T extends ApiVersion>(
  payload: ApiActionAddSignificantTermsGroupHistogram<T>['payload'],
  version: T
): ApiActionAddSignificantTermsGroupHistogram<T> {
  if (version === '1') {
    return {
      type: API_ACTION_NAME.ADD_SIGNIFICANT_TERMS_GROUP_HISTOGRAM,
      payload,
    } as ApiActionAddSignificantTermsGroupHistogram<T>;
  }

  return {
    type: API_ACTION_NAME.ADD_SIGNIFICANT_ITEMS_GROUP_HISTOGRAM,
    payload,
  } as ApiActionAddSignificantTermsGroupHistogram<T>;
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

export type AiopsLogRateAnalysisApiAction<T extends ApiVersion> =
  | ApiActionAddSignificantTerms<T>
  | ApiActionAddSignificantTermsGroup<T>
  | ApiActionAddSignificantTermsHistogram<T>
  | ApiActionAddSignificantTermsGroupHistogram<T>
  | ApiActionAddError
  | ApiActionPing
  | ApiActionResetAll
  | ApiActionResetErrors
  | ApiActionResetGroups
  | ApiActionUpdateLoadingState;

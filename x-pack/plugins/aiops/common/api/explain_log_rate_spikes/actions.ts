/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ChangePoint,
  ChangePointHistogram,
  ChangePointGroup,
  ChangePointGroupHistogram,
} from '@kbn/ml-agg-utils';

export const API_ACTION_NAME = {
  ADD_CHANGE_POINTS: 'add_change_points',
  ADD_CHANGE_POINTS_HISTOGRAM: 'add_change_points_histogram',
  ADD_CHANGE_POINTS_GROUP: 'add_change_point_group',
  ADD_CHANGE_POINTS_GROUP_HISTOGRAM: 'add_change_point_group_histogram',
  ADD_ERROR: 'add_error',
  PING: 'ping',
  RESET_ALL: 'reset_all',
  RESET_ERRORS: 'reset_errors',
  UPDATE_LOADING_STATE: 'update_loading_state',
} as const;
export type ApiActionName = typeof API_ACTION_NAME[keyof typeof API_ACTION_NAME];

interface ApiActionAddChangePoints {
  type: typeof API_ACTION_NAME.ADD_CHANGE_POINTS;
  payload: ChangePoint[];
}

export function addChangePointsAction(
  payload: ApiActionAddChangePoints['payload']
): ApiActionAddChangePoints {
  return {
    type: API_ACTION_NAME.ADD_CHANGE_POINTS,
    payload,
  };
}

interface ApiActionAddChangePointsHistogram {
  type: typeof API_ACTION_NAME.ADD_CHANGE_POINTS_HISTOGRAM;
  payload: ChangePointHistogram[];
}

export function addChangePointsHistogramAction(
  payload: ApiActionAddChangePointsHistogram['payload']
): ApiActionAddChangePointsHistogram {
  return {
    type: API_ACTION_NAME.ADD_CHANGE_POINTS_HISTOGRAM,
    payload,
  };
}

interface ApiActionAddChangePointsGroup {
  type: typeof API_ACTION_NAME.ADD_CHANGE_POINTS_GROUP;
  payload: ChangePointGroup[];
}

export function addChangePointsGroupAction(payload: ApiActionAddChangePointsGroup['payload']) {
  return {
    type: API_ACTION_NAME.ADD_CHANGE_POINTS_GROUP,
    payload,
  };
}

interface ApiActionAddChangePointsGroupHistogram {
  type: typeof API_ACTION_NAME.ADD_CHANGE_POINTS_GROUP_HISTOGRAM;
  payload: ChangePointGroupHistogram[];
}

export function addChangePointsGroupHistogramAction(
  payload: ApiActionAddChangePointsGroupHistogram['payload']
): ApiActionAddChangePointsGroupHistogram {
  return {
    type: API_ACTION_NAME.ADD_CHANGE_POINTS_GROUP_HISTOGRAM,
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

export type AiopsExplainLogRateSpikesApiAction =
  | ApiActionAddChangePoints
  | ApiActionAddChangePointsGroup
  | ApiActionAddChangePointsHistogram
  | ApiActionAddChangePointsGroupHistogram
  | ApiActionAddError
  | ApiActionPing
  | ApiActionResetAll
  | ApiActionResetErrors
  | ApiActionUpdateLoadingState;

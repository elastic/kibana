/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePoint } from '../../types';

export const API_ACTION_NAME = {
  ADD_CHANGE_POINTS: 'add_change_points',
  ERROR: 'error',
  RESET: 'reset',
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

interface ApiActionError {
  type: typeof API_ACTION_NAME.ERROR;
  payload: string;
}

export function errorAction(payload: ApiActionError['payload']): ApiActionError {
  return {
    type: API_ACTION_NAME.ERROR,
    payload,
  };
}

interface ApiActionReset {
  type: typeof API_ACTION_NAME.RESET;
}

export function resetAction(): ApiActionReset {
  return { type: API_ACTION_NAME.RESET };
}

interface ApiActionUpdateLoadingState {
  type: typeof API_ACTION_NAME.UPDATE_LOADING_STATE;
  payload: {
    ccsWarning: boolean;
    loaded: number;
    loadingState: string;
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
  | ApiActionError
  | ApiActionReset
  | ApiActionUpdateLoadingState;

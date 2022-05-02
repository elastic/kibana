/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApiAction, API_ACTION_NAME } from '../../common/api';

export const UI_ACTION_NAME = {
  CANCEL_STREAM: 'cancel_stream',
  RESET_STREAM: 'reset_stream',
  SET_STREAM_IS_RUNNING: 'set_stream_is_running',
} as const;
export type UiActionName = typeof UI_ACTION_NAME[keyof typeof UI_ACTION_NAME];

export interface StreamState {
  isCancelled: boolean;
  isRunning: boolean;
  progress: number;
  entities: Record<string, number>;
}
export const initialState: StreamState = {
  isCancelled: false,
  isRunning: false,
  progress: 0,
  entities: {},
};

interface UiActionSetIsRunning {
  type: typeof UI_ACTION_NAME.SET_STREAM_IS_RUNNING;
  payload: boolean;
}

export function setIsRunning(payload: boolean): UiActionSetIsRunning {
  return {
    type: UI_ACTION_NAME.SET_STREAM_IS_RUNNING,
    payload,
  };
}

interface UiActionResetStream {
  type: typeof UI_ACTION_NAME.RESET_STREAM;
}

export function resetStream(): UiActionResetStream {
  return { type: UI_ACTION_NAME.RESET_STREAM };
}

interface UiActionCancelStream {
  type: typeof UI_ACTION_NAME.CANCEL_STREAM;
}

export function cancelStream(): UiActionCancelStream {
  return { type: UI_ACTION_NAME.CANCEL_STREAM };
}

type UiAction = UiActionSetIsRunning | UiActionResetStream | UiActionCancelStream;
export type ReducerAction = ApiAction | UiAction;
export function streamReducer(
  state: StreamState,
  action: ReducerAction | ReducerAction[]
): StreamState {
  if (Array.isArray(action)) {
    return action.reduce(streamReducer, state);
  }

  switch (action.type) {
    case API_ACTION_NAME.UPDATE_PROGRESS:
      return {
        ...state,
        progress: action.payload,
      };
    case API_ACTION_NAME.DELETE_ENTITY:
      const deleteFromEntitis = { ...state.entities };
      delete deleteFromEntitis[action.payload];
      return {
        ...state,
        entities: deleteFromEntitis,
      };
    case API_ACTION_NAME.ADD_TO_ENTITY:
      const addToEntities = { ...state.entities };
      if (addToEntities[action.payload.entity] === undefined) {
        addToEntities[action.payload.entity] = action.payload.value;
      } else {
        addToEntities[action.payload.entity] += action.payload.value;
      }
      return {
        ...state,
        entities: addToEntities,
      };
    case UI_ACTION_NAME.SET_STREAM_IS_RUNNING:
      return {
        ...state,
        isRunning: action.payload,
      };
    case UI_ACTION_NAME.CANCEL_STREAM:
      return {
        ...state,
        isCancelled: true,
        isRunning: false,
      };
    case UI_ACTION_NAME.RESET_STREAM:
      return initialState;
    default:
      throw new Error();
  }
}

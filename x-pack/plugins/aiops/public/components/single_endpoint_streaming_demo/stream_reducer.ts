/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AiopsExampleStreamApiAction, API_ACTION_NAME } from '../../../common/api/example_stream';

export const UI_ACTION_NAME = {
  ERROR: 'error',
  RESET: 'reset',
} as const;
export type UiActionName = typeof UI_ACTION_NAME[keyof typeof UI_ACTION_NAME];

export interface StreamState {
  errors: string[];
  progress: number;
  entities: Record<string, number>;
}
export const initialState: StreamState = {
  errors: [],
  progress: 0,
  entities: {},
};

interface UiActionError {
  type: typeof UI_ACTION_NAME.ERROR;
  payload: string;
}
interface UiActionResetStream {
  type: typeof UI_ACTION_NAME.RESET;
}

export function resetStream(): UiActionResetStream {
  return { type: UI_ACTION_NAME.RESET };
}

type UiAction = UiActionResetStream | UiActionError;
export type ReducerAction = AiopsExampleStreamApiAction | UiAction;
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
      const deleteFromEntities = { ...state.entities };
      delete deleteFromEntities[action.payload];
      return {
        ...state,
        entities: deleteFromEntities,
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
    case UI_ACTION_NAME.RESET:
      return initialState;
    case UI_ACTION_NAME.ERROR:
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    default:
      return {
        ...state,
        errors: [...state.errors, 'UNKNOWN_ACTION_ERROR'],
      };
  }
}

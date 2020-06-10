/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux-actions';
import { Snapshot } from '../../../common/runtime_types';
import {
  getSnapshotCountAction,
  getSnapshotCountActionSuccess,
  getSnapshotCountActionFail,
} from '../actions';

export interface SnapshotState {
  count: Snapshot;
  errors: any[];
  loading: boolean;
}

const initialState: SnapshotState = {
  count: {
    down: 0,
    total: 0,
    up: 0,
  },
  errors: [],
  loading: false,
};

export function snapshotReducer(state = initialState, action: Action<any>): SnapshotState {
  switch (action.type) {
    case String(getSnapshotCountAction):
      return {
        ...state,
        loading: true,
      };
    case String(getSnapshotCountActionSuccess):
      return {
        ...state,
        count: action.payload,
        loading: false,
      };
    case String(getSnapshotCountActionFail):
      return {
        ...state,
        errors: [...state.errors, action.payload],
      };
    default:
      return state;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { indexStatusAction } from '../actions';
import { getAsyncInitialState, handleAsyncAction } from './utils';
import { AsyncInitialState } from './types';
import { StatesIndexStatus } from '../../../common/runtime_types';

export interface IndexStatusState {
  indexStatus: AsyncInitialState<StatesIndexStatus | null>;
}

const initialState: IndexStatusState = {
  indexStatus: getAsyncInitialState(),
};

type PayLoad = StatesIndexStatus & Error;

export const indexStatusReducer = handleActions<IndexStatusState, PayLoad>(
  {
    ...handleAsyncAction('indexStatus', indexStatusAction),
  },
  initialState
);

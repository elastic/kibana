/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { updateLimitOfPagination, updateUpperLimitOfPagination } from './actions';
import { UncommonProcessesModel } from './model';

// TODO: This should be merged in with hosts (folder for stage 2 refactor)

export type UncommonProcessesState = UncommonProcessesModel;

export const initialUncommonProcessesState: UncommonProcessesState = { limit: 10, upperLimit: 100 };

export const uncommonProcessesReducer = reducerWithInitialState(initialUncommonProcessesState)
  .case(updateUpperLimitOfPagination, (state, { upperLimit }) => ({
    ...state,
    upperLimit,
  }))
  .case(updateLimitOfPagination, (state, { limit }) => ({
    ...state,
    limit,
  }))
  .build();

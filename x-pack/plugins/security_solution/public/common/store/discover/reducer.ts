/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';
import {
  updateDiscoverAppState,
  updateDiscoverInternalState,
  updateDiscoverSavedSearchState,
} from './actions';
import { initialDiscoverAppState } from './model';

export const securitySolutionDiscoverReducer = reducerWithInitialState(initialDiscoverAppState)
  .case(updateDiscoverAppState, (state, { newState }) => {
    return {
      ...state,
      app: {
        ...state.app,
        ...newState,
      },
    };
  })
  .case(updateDiscoverInternalState, (state, { newState }) => {
    return {
      ...state,
      internal: newState,
    };
  })
  .case(updateDiscoverSavedSearchState, (state, { newState }) => {
    return {
      ...state,
      savedSearch: newState,
    };
  });

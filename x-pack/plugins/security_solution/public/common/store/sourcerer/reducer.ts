/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setActiveSourcererScopeId,
  setKibanaIndexPatterns,
  setIsIndexPatternsLoading,
  setIsSourceLoading,
  setSource,
} from './actions';
import { initialSourcererState, SourcererModel } from './model';
import { getSourceDefaults } from '../../containers/sourcerer';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setActiveSourcererScopeId, (state, { payload }) => ({
    ...state,
    activeSourcererScopeId: payload,
  }))
  .case(setKibanaIndexPatterns, (state, { payload }) => ({
    ...state,
    kibanaIndexPatterns: payload,
  }))
  .case(setIsIndexPatternsLoading, (state, { payload }) => ({
    ...state,
    isIndexPatternsLoading: payload,
  }))
  .case(setIsSourceLoading, (state, { id, payload }) => ({
    ...state,
    sourcerScopes: {
      ...state.sourcerScopes,
      [id]: {
        ...state.sourcerScopes[id],
        id,
        loading: payload,
      },
    },
  }))
  .case(setSource, (state, { id, payload }) => ({
    ...state,
    sourcerScopes: {
      ...state.sourcerScopes,
      [id]: {
        ...getSourceDefaults(id, payload.selectedPatterns),
        ...state.sourcerScopes[id],
        ...payload,
      },
    },
  }))
  .build();

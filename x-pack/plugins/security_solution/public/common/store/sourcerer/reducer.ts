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
  .case(setSource, (state, { id, payload }) => {
    console.log('setSource', { id, payload });
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...getSourceDefaults(id, payload.selectedPatterns),
          ...state.sourcererScopes[id],
          ...payload,
        },
      },
    };
  })
  .build();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEmpty from 'lodash/isEmpty';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setIndexPatternsList,
  setSourcererScopeLoading,
  setSelectedIndexPatterns,
  setSignalIndexName,
  setSource,
} from './actions';
import { initialSourcererState, SourcererModel } from './model';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setIndexPatternsList, (state, { kibanaIndexPatterns, configIndexPatterns }) => ({
    ...state,
    kibanaIndexPatterns,
    configIndexPatterns,
  }))
  .case(setSignalIndexName, (state, { signalIndexName }) => ({
    ...state,
    signalIndexName,
  }))
  .case(setSourcererScopeLoading, (state, { id, loading }) => ({
    ...state,
    sourcererScopes: {
      ...state.sourcererScopes,
      [id]: {
        ...state.sourcererScopes[id],
        loading,
      },
    },
  }))
  .case(setSelectedIndexPatterns, (state, { id, selectedPatterns }) => {
    const kibanaIndexPatterns = state.kibanaIndexPatterns.map((kip) => kip.title);
    const newSelectedPatterns = selectedPatterns.filter(
      (sp) =>
        state.configIndexPatterns.includes(sp) ||
        kibanaIndexPatterns.includes(sp) ||
        (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
    );
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          selectedPatterns: isEmpty(newSelectedPatterns)
            ? state.configIndexPatterns
            : newSelectedPatterns,
        },
      },
    };
  })
  .case(setSource, (state, { id, payload }) => {
    const { ...sourcererScopes } = payload;
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          ...sourcererScopes,
          ...(state.sourcererScopes[id].selectedPatterns.length === 0
            ? { selectedPatterns: state.configIndexPatterns }
            : {}),
        },
      },
    };
  })
  .build();

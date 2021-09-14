/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setSourcererScopeLoading,
  setSelectedDataView,
  setSignalIndexName,
  setSource,
} from './actions';
import { initialSourcererState, SourcererModel } from './model';
import { defaultDataViewByEventType } from './helpers';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
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
  .case(setSelectedDataView, (state, payload) => {
    const { id, eventType, ...rest } = payload;
    const pattern = state.kibanaDataViews.find((p) => p.id === rest.selectedDataViewId);
    // TODO: Steph/sourcerer needs unit tests
    const selectedPatterns =
      rest.selectedPatterns != null && pattern != null
        ? rest.selectedPatterns.filter(
            // ensures all selected patterns are selectable
            // and no patterns are duplicated
            (value, index, self) =>
              self.indexOf(value) === index && pattern.patternList.includes(value)
          )
        : [];
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          ...rest,
          selectedPatterns,
          ...(isEmpty(selectedPatterns) || pattern == null
            ? defaultDataViewByEventType({ state, eventType })
            : {}),
        },
      },
    };
  })
  .case(setSource, (state, { id, payload }) => {
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          ...payload,
        },
      },
    };
  })
  .build();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setSourcererDataViews,
  setSourcererScopeLoading,
  setSelectedDataView,
  setSignalIndexName,
  setSource,
} from './actions';
import { initialSourcererState, SourcererModel, SourcererScopeName } from './model';
import { validateSelectedPatterns } from './helpers';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setSignalIndexName, (state, { signalIndexName }) => ({
    ...state,
    signalIndexName,
  }))
  .case(setSourcererDataViews, (state, { defaultDataView, kibanaDataViews }) => ({
    ...state,
    defaultDataView,
    kibanaDataViews,
  }))
  .case(setSourcererScopeLoading, (state, { id, loading }) => ({
    ...state,
    sourcererScopes: {
      ...state.sourcererScopes,
      ...(id != null
        ? {
            [id]: {
              ...state.sourcererScopes[id],
              loading,
            },
          }
        : {
            [SourcererScopeName.default]: {
              ...state.sourcererScopes[SourcererScopeName.default],
              loading,
            },
            [SourcererScopeName.detections]: {
              ...state.sourcererScopes[SourcererScopeName.detections],
              loading,
            },
            [SourcererScopeName.timeline]: {
              ...state.sourcererScopes[SourcererScopeName.timeline],
              loading,
            },
          }),
    },
  }))
  .case(setSelectedDataView, (state, payload) => ({
    ...state,
    sourcererScopes: {
      ...state.sourcererScopes,
      ...validateSelectedPatterns(state, payload),
    },
  }))
  .case(setSource, (state, { scope, dataView }) => ({
    ...state,
    ...(dataView.id === state.defaultDataView.id
      ? {
          defaultDataView: { ...state.defaultDataView, ...dataView },
        }
      : {}),
    kibanaDataViews: state.kibanaDataViews.map((dv) =>
      dv.id === dataView.id ? { ...dv, ...dataView } : dv
    ),
    sourcererScopes: {
      ...state.sourcererScopes,
      [scope.id]: {
        ...state.sourcererScopes[scope.id],
        ...scope,
      },
    },
  }))
  .build();

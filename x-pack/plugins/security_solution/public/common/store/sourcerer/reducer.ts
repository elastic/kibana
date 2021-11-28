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
  setDataView,
  setDataViewLoading,
} from './actions';
import { initDataView, initialSourcererState, SourcererModel, SourcererScopeName } from './model';
import { getSelectedPatterns, validateSelectedPatterns } from './helpers';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setSignalIndexName, (state, { signalIndexName }) => ({
    ...state,
    signalIndexName,
  }))
  .case(setDataViewLoading, (state, { id, loading }) => {
    console.log('---setDataViewLoading');

    return {
      ...state,
      ...(id === state.defaultDataView.id
        ? {
            defaultDataView: { ...state.defaultDataView, loading },
          }
        : {}),
      kibanaDataViews: state.kibanaDataViews.map((dv) => (dv.id === id ? { ...dv, loading } : dv)),
    };
  })
  .case(setSourcererDataViews, (state, { defaultDataView, kibanaDataViews }) => {
    console.log('---setSourcererDataViews');

    return {
      ...state,
      defaultDataView: {
        ...state.defaultDataView,
        ...defaultDataView,
      },
      kibanaDataViews: kibanaDataViews.map((dataView) => ({
        ...(state.kibanaDataViews.find(({ id }) => id === dataView.id) ?? initDataView),
        ...dataView,
      })),
    };
  })
  .case(setSourcererScopeLoading, (state, { id, loading }) => {
    console.log('---setSourcererScopeLoading');
    return {
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
    };
  })
  .case(setSelectedDataView, (state, payload) => {
    console.log('---setSelectedDataView');

    const { shouldValidateSelectedPatterns = true, ...patternsInfo } = payload;
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        ...(shouldValidateSelectedPatterns
          ? validateSelectedPatterns(state, patternsInfo)
          : getSelectedPatterns(state, patternsInfo)),
      },
    };
  })
  .case(setDataView, (state, dataView) => ({
    ...state,
    ...(dataView.id === state.defaultDataView.id
      ? {
          defaultDataView: { ...state.defaultDataView, ...dataView },
        }
      : {}),
    kibanaDataViews: state.kibanaDataViews.map((dv) =>
      dv.id === dataView.id ? { ...dv, ...dataView } : dv
    ),
  }))
  .build();

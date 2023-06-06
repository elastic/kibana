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
  sourcererInitialized,
} from './actions';
import type { SourcererModel } from './model';
import { initDataView, initialSourcererState, SourcererScopeName } from './model';
import { validateSelectedPatterns, getScopePatternListSelection } from './helpers';

export type SourcererState = SourcererModel;

export const sourcererReducer = reducerWithInitialState(initialSourcererState)
  .case(setSignalIndexName, (state, { signalIndexName }) => ({
    ...state,
    signalIndexName,
  }))
  .case(setDataViewLoading, (state, { id, loading }) => ({
    ...state,
    ...(id === state.defaultDataView.id
      ? {
          defaultDataView: { ...state.defaultDataView, loading },
        }
      : {}),
    kibanaDataViews: state.kibanaDataViews.map((dv) => (dv.id === id ? { ...dv, loading } : dv)),
  }))
  .case(setSourcererDataViews, (state, { defaultDataView, kibanaDataViews }) => ({
    ...state,
    defaultDataView: {
      ...state.defaultDataView,
      ...defaultDataView,
    },
    kibanaDataViews: kibanaDataViews.map((dataView) => ({
      ...(state.kibanaDataViews.find(({ id }) => id === dataView.id) ?? initDataView),
      ...dataView,
    })),
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
  .case(setSelectedDataView, (state, payload) => {
    const { shouldValidateSelectedPatterns = true, ...patternsInfo } = payload;

    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        ...validateSelectedPatterns(state, patternsInfo, shouldValidateSelectedPatterns),
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
  .case(sourcererInitialized, (state, { defaultDataView, kibanaDataViews, signalIndexName }) => {
    const initialPatterns = {
      [SourcererScopeName.default]: getScopePatternListSelection(
        defaultDataView,
        SourcererScopeName.default,
        signalIndexName,
        true
      ),
      [SourcererScopeName.detections]: getScopePatternListSelection(
        defaultDataView,
        SourcererScopeName.detections,
        signalIndexName,
        true
      ),
      [SourcererScopeName.timeline]: getScopePatternListSelection(
        defaultDataView,
        SourcererScopeName.timeline,
        signalIndexName,
        true
      ),
    };
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [SourcererScopeName.default]: {
          ...state.sourcererScopes.default,
          selectedDataViewId: defaultDataView.id,
          loading: false,
          selectedPatterns: initialPatterns[SourcererScopeName.default],
        },
        [SourcererScopeName.detections]: {
          ...state.sourcererScopes.detections,
          selectedDataViewId: defaultDataView.id,
          loading: false,
          selectedPatterns: initialPatterns[SourcererScopeName.detections],
        },
        [SourcererScopeName.timeline]: {
          ...state.sourcererScopes.timeline,
          selectedDataViewId: defaultDataView.id,
          loading: false,
          selectedPatterns: initialPatterns[SourcererScopeName.timeline],
        },
      },
      defaultDataView,
      kibanaDataViews: kibanaDataViews.map((dataView) => ({ ...initDataView, ...dataView })),
      signalIndexName,
    };
  })
  .build();

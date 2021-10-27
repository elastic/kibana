/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reducerWithInitialState } from 'typescript-fsa-reducers';

import { set, unset } from 'lodash/fp';
import {
  setSourcererDataViews,
  setSourcererScopeLoading,
  setSelectedDataView,
  setSignalIndexName,
  setDataView,
  setDataViewLoading,
  addRuntimeField,
  removeRuntimeField,
} from './actions';
import {
  initDataView,
  initialSourcererState,
  SourcererDataView,
  SourcererModel,
  SourcererScopeName,
} from './model';
import { validateSelectedPatterns } from './helpers';
import { indexFieldToFieldSpec } from '../../containers/source/use_data_view';

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
  .case(setSelectedDataView, (state, payload) => ({
    ...state,
    sourcererScopes: {
      ...state.sourcererScopes,
      ...validateSelectedPatterns(state, payload),
    },
  }))
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
  .case(addRuntimeField, (state, { id, indexField, runtimeMapping }) => {
    const updateDataView = (dataView: SourcererDataView) => {
      return {
        ...dataView,
        browserFields: set(
          [indexField.category, 'fields', indexField.name],
          indexField,
          dataView.browserFields
        ),
        indexFields: [...dataView.indexFields, indexFieldToFieldSpec(indexField)],
        runtimeMappings: {
          ...dataView.runtimeMappings,
          [indexField.name]: runtimeMapping,
        },
      };
    };

    return {
      ...state,
      ...(id === state.defaultDataView.id
        ? {
            defaultDataView: updateDataView(state.defaultDataView),
          }
        : {}),
      kibanaDataViews: state.kibanaDataViews.map((dataView) =>
        dataView.id === id ? updateDataView(dataView) : dataView
      ),
    };
  })
  .case(removeRuntimeField, (state, { id, fieldName, fieldCategory }) => {
    const updateDataView = (dataView: SourcererDataView) => {
      return {
        ...dataView,
        browserFields: unset([fieldCategory, 'fields', fieldName], dataView.browserFields),
        indexFields: dataView.indexFields.filter(({ name }) => name !== fieldName),
        runtimeMappings: unset(fieldName, dataView.runtimeMappings),
      };
    };

    return {
      ...state,
      ...(id === state.defaultDataView.id
        ? {
            defaultDataView: updateDataView(state.defaultDataView),
          }
        : {}),
      kibanaDataViews: state.kibanaDataViews.map((dataView) =>
        dataView.id === id ? updateDataView(dataView) : dataView
      ),
    };
  })
  .build();

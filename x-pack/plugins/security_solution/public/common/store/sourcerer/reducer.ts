/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import isEmpty from 'lodash/isEmpty';
import { reducerWithInitialState } from 'typescript-fsa-reducers';

import {
  setIndexPatternsList,
  setSourcererScopeLoading,
  setSelectedIndexPatterns,
  setSignalIndexName,
  setSource,
  initTimelineIndexPatterns,
} from './actions';
import { initialSourcererState, SourcererModel, SourcererScopeName } from './model';

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
  .case(setSelectedIndexPatterns, (state, { id, selectedPatterns, eventType }) => {
    const kibanaIndexPatterns = state.kibanaIndexPatterns.map((kip) => kip.title);
    const newSelectedPatterns = selectedPatterns.filter(
      (sp) =>
        state.configIndexPatterns.includes(sp) ||
        kibanaIndexPatterns.includes(sp) ||
        (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
    );
    let defaultIndexPatterns = state.configIndexPatterns;
    if (id === SourcererScopeName.timeline && isEmpty(newSelectedPatterns)) {
      if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
        defaultIndexPatterns = [...state.configIndexPatterns, state.signalIndexName ?? ''];
      } else if (eventType === 'raw') {
        defaultIndexPatterns = state.configIndexPatterns;
      } else if (
        !isEmpty(state.signalIndexName) &&
        (eventType === 'signal' || eventType === 'alert')
      ) {
        defaultIndexPatterns = [state.signalIndexName ?? ''];
      }
    } else if (id === SourcererScopeName.detections && isEmpty(newSelectedPatterns)) {
      defaultIndexPatterns = [state.signalIndexName ?? ''];
    }
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          selectedPatterns: isEmpty(newSelectedPatterns)
            ? defaultIndexPatterns
            : newSelectedPatterns,
        },
      },
    };
  })
  .case(initTimelineIndexPatterns, (state, { id, selectedPatterns, eventType }) => {
    let defaultIndexPatterns = state.configIndexPatterns;
    if (isEmpty(selectedPatterns)) {
      if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
        defaultIndexPatterns = [...state.configIndexPatterns, state.signalIndexName ?? ''];
      } else if (eventType === 'raw') {
        defaultIndexPatterns = state.configIndexPatterns;
      } else if (
        !isEmpty(state.signalIndexName) &&
        (eventType === 'signal' || eventType === 'alert')
      ) {
        defaultIndexPatterns = [state.signalIndexName ?? ''];
      }
    }
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          selectedPatterns: isEmpty(selectedPatterns) ? defaultIndexPatterns : selectedPatterns,
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

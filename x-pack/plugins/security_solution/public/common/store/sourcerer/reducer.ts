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
  setSelectedKip,
  setSelectedIndexPatterns,
  setSignalIndexName,
  setSource,
  initTimelineIndexPatterns,
} from './actions';
import { initialSourcererState, SourcererModel } from './model';
import {
  createDefaultIndexPatterns,
  defaultIndexPatternByEventType,
  getScopePatternListSelection,
} from './helpers';

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
  .case(setSelectedKip, (state, { id, selectedKipId, selectedPatterns, eventType }) => {
    const sPatterns =
      selectedPatterns != null
        ? selectedPatterns
        : getScopePatternListSelection(state.kibanaIndexPatterns, selectedKipId, id);
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          selectedKipId,
          selectedPatterns: sPatterns, // TODO: Steph/sourcerer createDefaultIndexPatterns({ eventType, id, selectedPatterns, state }),
        },
      },
    };
  })
  // TODO: Steph/sourcerer can delete
  .case(setSelectedIndexPatterns, (state, { id, selectedPatterns, eventType }) => {
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          selectedPatterns: createDefaultIndexPatterns({ eventType, id, selectedPatterns, state }),
        },
      },
    };
  })
  .case(initTimelineIndexPatterns, (state, { id, selectedPatterns, eventType }) => {
    return {
      ...state,
      sourcererScopes: {
        ...state.sourcererScopes,
        [id]: {
          ...state.sourcererScopes[id],
          selectedPatterns: isEmpty(selectedPatterns)
            ? defaultIndexPatternByEventType({ state, eventType })
            : selectedPatterns,
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer } from 'redux';
import { ResolverUIState } from '../../types';
import { ResolverAction } from '../actions';
export const uiReducer: Reducer<ResolverUIState, ResolverAction> = (
  state = {
    ariaActiveDescendant: null,
    selectedNode: null,
  },
  action
) => {
  if (action.type === 'serverReturnedResolverData') {
    const next: ResolverUIState = {
      ...state,
      ariaActiveDescendant: action.payload.result.entityID,
      selectedNode: action.payload.result.entityID,
    };
    return next;
  } else if (action.type === 'userFocusedOnResolverNode') {
    const next: ResolverUIState = {
      ...state,
      ariaActiveDescendant: action.payload,
    };
    return next;
  } else if (action.type === 'appReceivedNewExternalProperties') {
    const next: ResolverUIState = {
      ...state,
      locationSearch: action.payload.locationSearch,
      resolverComponentInstanceID: action.payload.resolverComponentInstanceID,
    };
    return next;
  } else {
    return state;
  }
};

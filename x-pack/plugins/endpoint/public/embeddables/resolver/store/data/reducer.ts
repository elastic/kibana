/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { DataState, ResolverAction } from '../../types';

function initialState(): DataState {
  return {
    results: [],
    isLoading: false,
  };
}

export const dataReducer: Reducer<DataState, ResolverAction> = (state = initialState(), action) => {
  if (action.type === 'serverReturnedResolverData') {
    const {
      data: {
        result: { search_results },
      },
    } = action.payload;
    return {
      ...state,
      results: search_results,
      isLoading: false,
    };
  } else if (action.type === 'appRequestedResolverData') {
    return {
      ...state,
      isLoading: true,
    };
  } else {
    return state;
  }
};

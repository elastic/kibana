/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { DataState, ResolverAction } from '../../types';
import { sampleData } from './sample';

function initialState(): DataState {
  return {
    results: sampleData.data.result.search_results,
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
    };
  } else {
    return state;
  }
};

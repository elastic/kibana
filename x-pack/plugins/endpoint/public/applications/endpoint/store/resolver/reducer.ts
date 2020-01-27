/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { AppAction } from '../action';

const initialState = (): any => {
  return {
    events: [],
  };
};

export const eventListReducer: Reducer<any, AppAction> = (state = initialState(), action) => {
  if (action.type === 'serverReturnedResolverData') {
    return {
      ...state,
      events: action.payload,
    };
  }

  return state;
};

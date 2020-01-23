/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { AlertListState } from './types';
import { AppAction } from '../action';

const initialState = (): AlertListState => {
  return {
    alerts: [],
  };
};

export const alertListReducer: Reducer<AlertListState, AppAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'serverReturnedAlertsData') {
    return {
      ...state,
      alerts: action.payload,
    };
  }

  return state;
};

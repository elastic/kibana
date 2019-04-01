/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { updateRefreshIntervalFromDatePicker, updateTimeFromDatePicker, updateDateFromUrl } from '../actions';

const defaultState = {
  isSet: false,
  refreshInterval: {},
  time: {}
};

export const date = handleActions(
  {
    [updateTimeFromDatePicker](state, action) {
      const { date } = action.payload;

      return {
        ...state,
        isSet: true,
        time: {
          ...state.time,
          ...date,
        }
      };
    },
    [updateRefreshIntervalFromDatePicker](state, action) {
      const { date: { refreshInterval, isPaused } } = action.payload;

      return {
        ...state,
        isSet: true,
        refreshInterval: {
          ...state.refreshInterval,
          value: refreshInterval,
          pause: isPaused,
        },
      };
    },
    [updateDateFromUrl](state, action) {
      const { date } = action.payload;
      return {
        ...state,
        isSet: true,
        ...date
      };
    },
  },
  defaultState
);

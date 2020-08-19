/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  hideEditMonitorFlyout,
  postMonitorConfig,
  showEditMonitorFlyout,
} from '../actions/central_management';

export interface CentralManagementState {
  isEditFlyoutVisible: boolean;
  loading: boolean;
}

const initialState: CentralManagementState = {
  isEditFlyoutVisible: false,
  loading: false,
};

export const centralManagementReducer = handleActions<CentralManagementState, any>(
  {
    [String(postMonitorConfig)]: (state) => {
      return { ...state, loading: true };
    },
    [String(showEditMonitorFlyout)]: (state) => ({
      ...state,
      isEditFlyoutVisible: true,
    }),
    [String(hideEditMonitorFlyout)]: (state) => ({
      ...state,
      isEditFlyoutVisible: false,
    }),
  },
  initialState
);

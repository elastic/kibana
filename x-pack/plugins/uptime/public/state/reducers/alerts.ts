/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { getAsyncInitialState, handleAsyncAction } from './utils';
import { AsyncInitialState } from './types';
import { deleteAlertAction, getExistingAlertAction } from '../actions/alerts';
import { Alert } from '../../../../triggers_actions_ui/public';

export interface AlertsState {
  alert: AsyncInitialState<Alert>;
  alertDeletion: AsyncInitialState<boolean>;
}

const initialState: AlertsState = {
  alert: getAsyncInitialState(),
  alertDeletion: getAsyncInitialState(),
};

export const alertsReducer = handleActions<AlertsState>(
  {
    ...handleAsyncAction<AlertsState>('alert', getExistingAlertAction),
    ...handleAsyncAction<AlertsState>('alertDeletion', deleteAlertAction),
  },
  initialState
);

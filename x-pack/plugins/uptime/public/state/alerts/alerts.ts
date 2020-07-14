/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { takeLatest, call, put } from 'redux-saga/effects';
import { Action } from 'redux';
import { createAsyncAction } from '../actions/utils';
import { getAsyncInitialState, handleAsyncAction } from '../reducers/utils';
import { AppState } from '../index';
import { AsyncInitialState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import { createAlert, fetchAlertRecords, fetchConnectors } from '../api/alerts';
import {
  ActionConnector as RawActionConnector,
  Alert,
} from '../../../../triggers_actions_ui/public';
import { kibanaService } from '../kibana_service';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const createAlertAction = createAsyncAction<{}, ActionConnector[]>('CREATE ALERT');
export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');
export const getMonitorAlertsAction = createAsyncAction<{}, Alert[]>('GET ALERTS');

interface AlertState {
  connectors: AsyncInitialState<ActionConnector[]>;
  newAlert: AsyncInitialState<ActionConnector[]>;
  alerts: AsyncInitialState<Alert[]>;
}

const initialState = {
  connectors: getAsyncInitialState(),
  newAlert: getAsyncInitialState(),
  alerts: getAsyncInitialState(),
};

export const alertReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
    ...handleAsyncAction<AlertState>('newAlert', createAlertAction),
    ...handleAsyncAction<AlertState>('alerts', getMonitorAlertsAction),
  },
  initialState
);

export function* fetchConnectorsEffect() {
  yield takeLatest(
    getConnectorsAction.get,
    fetchEffectFactory(fetchConnectors, getConnectorsAction.success, getConnectorsAction.fail)
  );
  yield takeLatest(
    getMonitorAlertsAction.get,
    fetchEffectFactory(
      fetchAlertRecords,
      getMonitorAlertsAction.success,
      getMonitorAlertsAction.fail
    )
  );
  yield takeLatest(String(createAlertAction.get), function* (action: Action) {
    try {
      const response = yield call(createAlert, action.payload);
      yield put(createAlertAction.success(response));
      kibanaService.core.notifications.toasts.addSuccess('Alert successfully added!');
      yield put(getMonitorAlertsAction.get());
    } catch (err) {
      kibanaService.core.notifications.toasts.addError(err, {
        title: 'Alert cannot be added',
      });
      yield put(createAlertAction.fail(err));
    }
  });
}

export const connectorsSelector = ({ alerts }: AppState) => alerts.connectors;
export const newAlertSelector = ({ alerts }: AppState) => alerts.newAlert;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { takeLatest, call, put, select } from 'redux-saga/effects';
import { Action } from 'redux';
import { createAsyncAction } from '../actions/utils';
import { getAsyncInitialState, handleAsyncAction } from '../reducers/utils';
import { AppState } from '../index';
import { AsyncInitialState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import {
  createAlert,
  disableAnomalyAlert,
  fetchAlertRecords,
  fetchConnectors,
  fetchMonitorAlertRecords,
} from '../api/alerts';
import {
  ActionConnector as RawActionConnector,
  Alert,
} from '../../../../triggers_actions_ui/public';
import { kibanaService } from '../kibana_service';
import { deleteAlertAction, getExistingAlertAction } from '../actions/alerts';
import { monitorIdSelector } from '../selectors';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const createAlertAction = createAsyncAction<{}, ActionConnector[]>('CREATE ALERT');
export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');
export const getMonitorAlertsAction = createAsyncAction<{}, Alert[]>('GET ALERTS');

interface AlertState {
  connectors: AsyncInitialState<ActionConnector[]>;
  newAlert: AsyncInitialState<ActionConnector[]>;
  alerts: AsyncInitialState<Alert[]>;
  alert: AsyncInitialState<Alert>;
  alertDeletion: AsyncInitialState<boolean>;
}

const initialState = {
  connectors: getAsyncInitialState(),
  newAlert: getAsyncInitialState(),
  alerts: getAsyncInitialState(),
  alert: getAsyncInitialState(),
  alertDeletion: getAsyncInitialState(),
};

export const alertsReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
    ...handleAsyncAction<AlertState>('newAlert', createAlertAction),
    ...handleAsyncAction<AlertState>('alerts', getMonitorAlertsAction),
    ...handleAsyncAction<AlertState>('alert', getExistingAlertAction),
    ...handleAsyncAction<AlertState>('alertDeletion', deleteAlertAction),
  },
  initialState
);

export function* fetchAlertsEffect() {
  yield takeLatest(
    getExistingAlertAction.get,
    fetchEffectFactory(
      fetchAlertRecords,
      getExistingAlertAction.success,
      getExistingAlertAction.fail
    )
  );

  yield takeLatest(String(deleteAlertAction.get), function* (action: Action<{ alertId: string }>) {
    try {
      const response = yield call(disableAnomalyAlert, action.payload);
      yield put(deleteAlertAction.success(response));
      kibanaService.core.notifications.toasts.addSuccess('Alert successfully deleted!');
      const monitorId = yield select(monitorIdSelector);
      yield put(getExistingAlertAction.get({ monitorId }));
    } catch (err) {
      kibanaService.core.notifications.toasts.addError(err, {
        title: 'Alert cannot be deleted',
      });
      yield put(deleteAlertAction.fail(err));
    }
  });

  yield takeLatest(
    getConnectorsAction.get,
    fetchEffectFactory(fetchConnectors, getConnectorsAction.success, getConnectorsAction.fail)
  );
  yield takeLatest(
    getMonitorAlertsAction.get,
    fetchEffectFactory(
      fetchMonitorAlertRecords,
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
export const alertSelector = ({ alerts }: AppState) => alerts.alert;
export const alertsSelector = ({ alerts }: AppState) => alerts.alerts;

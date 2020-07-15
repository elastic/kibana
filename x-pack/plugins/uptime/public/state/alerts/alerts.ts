/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { createAsyncAction } from '../actions/utils';
import { asyncInitState, handleAsyncAction } from '../reducers/utils';
import { AppState } from '../index';
import { AsyncInitState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import {
  createAlert,
  disableAnomalyAlert,
  fetchAlertRecords,
  fetchConnectors,
  fetchMonitorAlertRecords,
  NewAlertParams,
} from '../api/alerts';
import {
  ActionConnector as RawActionConnector,
  Alert,
} from '../../../../triggers_actions_ui/public';
import { kibanaService } from '../kibana_service';
import { monitorIdSelector } from '../selectors';
import { AlertsResult, MonitorIdParam } from '../actions/types';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const createAlertAction = createAsyncAction<NewAlertParams, Alert>('CREATE ALERT');
export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');
export const getMonitorAlertsAction = createAsyncAction<{}, AlertsResult>('GET ALERTS');
export const getExistingAlertAction = createAsyncAction<MonitorIdParam, Alert>(
  'GET EXISTING ALERTS'
);
export const deleteAlertAction = createAsyncAction<{ alertId: string }, any>('DELETE ALERTS');

interface AlertState {
  connectors: AsyncInitState<ActionConnector[]>;
  newAlert: AsyncInitState<Alert>;
  alerts: AsyncInitState<AlertsResult>;
  anomalyAlert: AsyncInitState<Alert>;
  alertDeletion: AsyncInitState<boolean>;
}

const initialState = {
  connectors: asyncInitState(),
  newAlert: asyncInitState(),
  alerts: asyncInitState(),
  anomalyAlert: asyncInitState(),
  alertDeletion: asyncInitState(),
};

export const alertsReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
    ...handleAsyncAction<AlertState>('newAlert', createAlertAction),
    ...handleAsyncAction<AlertState>('alerts', getMonitorAlertsAction),
    ...handleAsyncAction<AlertState>('anomalyAlert', getExistingAlertAction),
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

  yield takeLatest(deleteAlertAction.get, function* (action: Action<{ alertId: string }>) {
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
  yield takeLatest(createAlertAction.get, function* (action: Action<NewAlertParams>) {
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
export const anomalyAlertSelector = ({ alerts }: AppState) => alerts.anomalyAlert;
export const alertsSelector = ({ alerts }: AppState) => alerts.alerts;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { handleActions, Action } from 'redux-actions';
import { call, put, select, takeLatest } from 'redux-saga/effects';
import { createAsyncAction } from '../actions/utils';
import { asyncInitState, handleAsyncAction } from '../reducers/utils';
import { AppState } from '../index';
import { AsyncInitState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import {
  createAlert,
  disableAlertById,
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
import { simpleAlertEnabled } from '../../lib/alert_types/alert_messages';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const createAlertAction = createAsyncAction<NewAlertParams, Alert | null>('CREATE ALERT');
export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');
export const getMonitorAlertsAction = createAsyncAction<{}, AlertsResult | null>('GET ALERTS');

export const getAnomalyAlertAction = createAsyncAction<MonitorIdParam, Alert>(
  'GET EXISTING ALERTS'
);
export const deleteAlertAction = createAsyncAction<{ alertId: string }, string | null>(
  'DELETE ALERTS'
);
export const deleteAnomalyAlertAction = createAsyncAction<{ alertId: string }, any>(
  'DELETE ANOMALY ALERT'
);

interface AlertState {
  connectors: AsyncInitState<ActionConnector[]>;
  newAlert: AsyncInitState<Alert>;
  alerts: AsyncInitState<AlertsResult>;
  anomalyAlert: AsyncInitState<Alert>;
  alertDeletion: AsyncInitState<string>;
  anomalyAlertDeletion: AsyncInitState<boolean>;
}

const initialState = {
  connectors: asyncInitState(),
  newAlert: asyncInitState(),
  alerts: asyncInitState(),
  anomalyAlert: asyncInitState(),
  alertDeletion: asyncInitState(),
  anomalyAlertDeletion: asyncInitState(),
};

export const alertsReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
    ...handleAsyncAction<AlertState>('newAlert', createAlertAction),
    ...handleAsyncAction<AlertState>('alerts', getMonitorAlertsAction),
    ...handleAsyncAction<AlertState>('anomalyAlert', getAnomalyAlertAction),
    ...handleAsyncAction<AlertState>('alertDeletion', deleteAlertAction),
    ...handleAsyncAction<AlertState>('anomalyAlertDeletion', deleteAnomalyAlertAction),
  },
  initialState
);

const showAlertDisabledSuccess = () => {
  kibanaService.core.notifications.toasts.addSuccess(
    i18n.translate('xpack.uptime.overview.alerts.disabled.success', {
      defaultMessage: 'Alert successfully disabled!',
    })
  );
};

const showAlertDisabledFailed = (err: Error) => {
  kibanaService.core.notifications.toasts.addError(err, {
    title: i18n.translate('xpack.uptime.overview.alerts.disabled.failed', {
      defaultMessage: 'Alert cannot be disabled!',
    }),
  });
};

export function* fetchAlertsEffect() {
  yield takeLatest(
    getAnomalyAlertAction.get,
    fetchEffectFactory(fetchAlertRecords, getAnomalyAlertAction.success, getAnomalyAlertAction.fail)
  );

  yield takeLatest(deleteAnomalyAlertAction.get, function* (action: Action<{ alertId: string }>) {
    try {
      yield call(disableAlertById, action.payload);
      yield put(deleteAnomalyAlertAction.success(action.payload.alertId));
      showAlertDisabledSuccess();
      const monitorId = yield select(monitorIdSelector);
      yield put(getAnomalyAlertAction.get({ monitorId }));
    } catch (err) {
      showAlertDisabledFailed(err);
      yield put(deleteAnomalyAlertAction.fail(err));
    }
  });

  yield takeLatest(deleteAlertAction.get, function* (action: Action<{ alertId: string }>) {
    try {
      yield call(disableAlertById, action.payload);
      // clear previous state
      yield put(createAlertAction.success(null));
      yield put(deleteAlertAction.success(action.payload.alertId));

      showAlertDisabledSuccess();
      yield put(getMonitorAlertsAction.get());
    } catch (err) {
      showAlertDisabledFailed(err);
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

      kibanaService.core.notifications.toasts.addSuccess(
        simpleAlertEnabled(action.payload.defaultActions)
      );
      yield put(getMonitorAlertsAction.get());
    } catch (err) {
      kibanaService.core.notifications.toasts.addError(err, {
        title: i18n.translate('xpack.uptime.overview.alerts.enabled.failed', {
          defaultMessage: 'Alert cannot be enabled!',
        }),
      });
      yield put(createAlertAction.fail(err));
    }
  });
}

export const connectorsSelector = ({ alerts }: AppState) => alerts.connectors;
export const newAlertSelector = ({ alerts }: AppState) => alerts.newAlert;
export const alertsSelector = ({ alerts }: AppState) => alerts.alerts;
export const isAlertDeletedSelector = ({ alerts }: AppState) => alerts.alertDeletion;

export const anomalyAlertSelector = ({ alerts }: AppState) => alerts.anomalyAlert;

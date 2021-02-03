/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction, handleActions, Action } from 'redux-actions';
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
import { ActionConnector as RawActionConnector } from '../../../../triggers_actions_ui/public';
import { Alert } from '../../../../alerts/common';
import { kibanaService } from '../kibana_service';
import { monitorIdSelector } from '../selectors';
import { AlertsResult, MonitorIdParam } from '../actions/types';
import { simpleAlertEnabled } from '../../lib/alert_types/alert_messages';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

/**
 * TODO: Use actual AlertType Params type that's specific to Uptime instead of `any`
 */
export type UptimeAlertTypeParams = Record<string, any>;

export const createAlertAction = createAsyncAction<
  NewAlertParams,
  Alert<UptimeAlertTypeParams> | null
>('CREATE ALERT');
export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');
export const getMonitorAlertsAction = createAsyncAction<{}, AlertsResult | null>('GET ALERTS');

export const getAnomalyAlertAction = createAsyncAction<
  MonitorIdParam,
  Alert<UptimeAlertTypeParams>
>('GET EXISTING ALERTS');
export const deleteAlertAction = createAsyncAction<
  { alertId: string; monitorId: string },
  string | null
>('DELETE ALERTS');
export const deleteAnomalyAlertAction = createAsyncAction<{ alertId: string }, any>(
  'DELETE ANOMALY ALERT'
);

interface AsyncLoadingPayload {
  monitorId: string;
  monitorName?: string;
}

const ASYNC_REQUEST_PENDING = 'ASYNC_REQUEST_PENDING';
const ASYNC_REQUEST_RESOLVED = 'ASYNC_REQUEST_RESOLVED';

const createAsyncLoadingAction = createAction<AsyncLoadingPayload>(ASYNC_REQUEST_PENDING);
const resolveAsyncLoadingAction = createAction<AsyncLoadingPayload>(ASYNC_REQUEST_RESOLVED);

export interface AlertState {
  connectors: AsyncInitState<ActionConnector[]>;
  newAlert: AsyncInitState<Alert<UptimeAlertTypeParams>>;
  alerts: AsyncInitState<AlertsResult>;
  anomalyAlert: AsyncInitState<Alert<UptimeAlertTypeParams>>;
  alertDeletion: AsyncInitState<string>;
  anomalyAlertDeletion: AsyncInitState<boolean>;
  pendingAlertRequests: AsyncLoadingPayload[];
}

const initialState = {
  connectors: asyncInitState(),
  newAlert: asyncInitState(),
  alerts: asyncInitState(),
  anomalyAlert: asyncInitState(),
  alertDeletion: asyncInitState(),
  anomalyAlertDeletion: asyncInitState(),
  pendingAlertRequests: [],
};

export const alertsReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
    ...handleAsyncAction<AlertState>('newAlert', createAlertAction),
    ...handleAsyncAction<AlertState>('alerts', getMonitorAlertsAction),
    ...handleAsyncAction<AlertState>('anomalyAlert', getAnomalyAlertAction),
    ...handleAsyncAction<AlertState>('alertDeletion', deleteAlertAction),
    ...handleAsyncAction<AlertState>('anomalyAlertDeletion', deleteAnomalyAlertAction),
    [String(createAsyncLoadingAction)]: (state: any, action: any) => {
      const { pendingAlertRequests } = state;
      const nextPendingAR = [...pendingAlertRequests, action.payload];
      return {
        ...state,
        pendingAlertRequests: nextPendingAR,
      };
    },
    [String(resolveAsyncLoadingAction)]: (state: any, action: any) => {
      const { pendingAlertRequests } = state;
      const nextPendingAlertRequests = pendingAlertRequests.filter(
        (req: AsyncLoadingPayload) => req.monitorId !== action.payload.monitorId
      );
      return {
        ...state,
        pendingAlertRequests: nextPendingAlertRequests,
      };
    },
    // ...{
    //   [String(createAlertAction.get)]: (state: any, action: Action<any>) => {
    //     const {
    //       payload: { monitorId, monitorName },
    //     } = action;
    //     const newState = {
    //       ...state,
    //       newAlert: {
    //         ...(state as any).newAlert,
    //         pendingMonitorIds: [{ [monitorId]: monitorName }],
    //         loading: true,
    //       },
    //     };
    //     return newState;
    //   },
    //   [String(createAlertAction.success)]: (state: any, action: any) => {
    //     return {
    //       ...state,
    //       newAlert: {
    //         ...(state as any).newAlert,
    //         data: action.payload,
    //         loading: false,
    //       },
    //     };
    //   },
    //   [String(createAlertAction.fail)]: (state: any, action: any) => {
    //     const {
    //       payload: { monitorId },
    //     } = action;
    //     const {
    //       newAlert: { pendingMonitorIds },
    //     } = state;

    //     return {
    //       ...state,
    //       newAlert: {
    //         ...(state as any).newAlert,
    //         pendingMonitorIds: pendingMonitorIds.filter((item) => !item[monitorId]),
    //         data: null,
    //         error: action.payload,
    //         loading: false,
    //       },
    //     };
    //   },
    // },
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
    const monitorId = yield select(monitorIdSelector);
    try {
      yield put(createAsyncLoadingAction({ monitorId }));
      yield call(disableAlertById, action.payload);
      yield put(resolveAsyncLoadingAction({ monitorId }));
      yield put(deleteAnomalyAlertAction.success(action.payload.alertId));
      showAlertDisabledSuccess();
      yield put(getAnomalyAlertAction.get({ monitorId }));
    } catch (err) {
      showAlertDisabledFailed(err);
      yield put(resolveAsyncLoadingAction({ monitorId }));
      yield put(deleteAnomalyAlertAction.fail(err));
    }
  });

  yield takeLatest(
    deleteAlertAction.get,
    function* (action: Action<{ alertId: string; monitorId: string }>) {
      const {
        payload: { monitorId },
      } = action;
      try {
        yield put(createAsyncLoadingAction({ monitorId }));
        yield call(disableAlertById, action.payload);
        // clear previous state
        yield put(resolveAsyncLoadingAction({ monitorId }));
        yield put(createAlertAction.success(null));
        yield put(deleteAlertAction.success(action.payload.alertId));

        showAlertDisabledSuccess();
        yield put(getMonitorAlertsAction.get());
      } catch (err) {
        showAlertDisabledFailed(err);
        yield put(resolveAsyncLoadingAction({ monitorId }));
        yield put(deleteAlertAction.fail(err));
      }
    }
  );

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
    const {
      payload: { monitorId, monitorName },
    } = action;
    try {
      yield put(createAsyncLoadingAction({ monitorId, monitorName }));
      const response = yield call(createAlert, action.payload);
      yield put(createAlertAction.success(response));

      yield put(resolveAsyncLoadingAction({ monitorId, monitorName }));
      kibanaService.core.notifications.toasts.addSuccess(
        simpleAlertEnabled(action.payload.defaultActions)
      );
      yield put(getMonitorAlertsAction.get());
    } catch (error) {
      kibanaService.core.notifications.toasts.addError(error, {
        title: i18n.translate('xpack.uptime.overview.alerts.enabled.failed', {
          defaultMessage: 'Alert cannot be enabled!',
        }),
      });
      yield put(resolveAsyncLoadingAction({ monitorId, monitorName }));
      yield put(createAlertAction.fail(error));
    }
  });
}

export const connectorsSelector = ({ alerts }: AppState) => alerts.connectors;
export const newAlertSelector = ({ alerts }: AppState) => alerts.newAlert;
export const alertsSelector = ({ alerts }: AppState) => alerts.alerts;
export const isAlertDeletedSelector = ({ alerts }: AppState) => alerts.alertDeletion;

export const anomalyAlertSelector = ({ alerts }: AppState) => alerts.anomalyAlert;
export const isAnomalyAlertDeleting = ({ alerts }: AppState) => alerts.anomalyAlertDeletion.loading;

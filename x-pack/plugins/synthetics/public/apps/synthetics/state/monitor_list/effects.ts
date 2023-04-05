/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeEvery, select, debounce } from 'redux-saga/effects';
import { SavedObject } from '@kbn/core-saved-objects-common';
import { quietFetchOverviewStatusAction } from '../overview_status';
import { enableDefaultAlertingAction } from '../alert_rules';
import { ConfigKey, SyntheticsMonitor } from '../../../../../common/runtime_types';
import { kibanaService } from '../../../../utils/kibana_service';
import { MonitorOverviewPageState } from '../overview';
import { quietFetchOverviewAction } from '../overview/actions';
import { selectOverviewState } from '../overview/selectors';
import { fetchEffectFactory, sendErrorToast, sendSuccessToast } from '../utils/fetch_effect';
import { serializeHttpFetchError } from '../utils/http_error';
import {
  clearMonitorUpsertStatus,
  enableMonitorAlertAction,
  fetchMonitorListAction,
  fetchUpsertFailureAction,
  fetchUpsertMonitorAction,
  fetchUpsertSuccessAction,
  quietFetchMonitorListAction,
} from './actions';
import { fetchMonitorManagementList, fetchUpsertMonitor } from './api';
import { toastTitle } from './toast_title';
import { UpsertMonitorRequest } from './models';

export function* fetchMonitorListEffect() {
  yield debounce(
    300, // Only take the latest while ignoring any intermediate triggers
    [fetchMonitorListAction.get, quietFetchMonitorListAction],
    fetchEffectFactory(
      fetchMonitorManagementList,
      fetchMonitorListAction.success,
      fetchMonitorListAction.fail
    )
  );
}

export function* enableMonitorAlertEffect() {
  yield takeEvery(
    enableMonitorAlertAction.get,
    function* (action: PayloadAction<UpsertMonitorRequest>): Generator {
      try {
        const response = yield call(fetchUpsertMonitor, action.payload);
        yield put(enableMonitorAlertAction.success(response as SavedObject<SyntheticsMonitor>));
        sendSuccessToast(action.payload.success);
        if (
          (response as SavedObject<SyntheticsMonitor>).attributes[ConfigKey.ALERT_CONFIG]?.status
            ?.enabled
        ) {
          yield put(enableDefaultAlertingAction.get());
        }
      } catch (error) {
        sendErrorToast(action.payload.error, error);
        yield put(
          enableMonitorAlertAction.fail({
            configId: action.payload.configId,
            error: serializeHttpFetchError(error, action.payload),
          })
        );
      }
    }
  );
}

export function* upsertMonitorEffect() {
  yield takeEvery(
    fetchUpsertMonitorAction,
    function* (action: PayloadAction<UpsertMonitorRequest>): Generator {
      try {
        const response = yield call(fetchUpsertMonitor, action.payload);
        yield put(
          fetchUpsertSuccessAction(response as { id: string; attributes: { enabled: boolean } })
        );
        kibanaService.toasts.addSuccess({
          title: toastTitle({
            title: action.payload.success.message,
            testAttribute: action.payload.success.testAttribute,
          }),
          toastLifeTimeMs: action.payload.success.lifetimeMs,
        });
      } catch (error) {
        kibanaService.toasts.addError(error, {
          ...action.payload.error.message,
          toastLifeTimeMs: action.payload.error.lifetimeMs,
        });
        yield put(
          fetchUpsertFailureAction({
            configId: action.payload.configId,
            error: serializeHttpFetchError(error, action.payload),
          })
        );
      } finally {
        if (action.payload.shouldQuietFetchAfterSuccess !== false) {
          const monitorState = yield select(selectOverviewState);
          if (hasPageState(monitorState)) {
            yield put(quietFetchOverviewAction.get(monitorState.pageState));
            yield put(
              quietFetchOverviewStatusAction.get({
                pageState: monitorState.pageState,
              })
            );
          }
        }
        yield put(clearMonitorUpsertStatus(action.payload.configId));
      }
    }
  );
}

function hasPageState(value: any): value is { pageState: MonitorOverviewPageState } {
  return Object.keys(value).includes('pageState');
}

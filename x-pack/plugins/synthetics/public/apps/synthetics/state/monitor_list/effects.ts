/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PayloadAction } from '@reduxjs/toolkit';
import { call, put, takeEvery, takeLeading, select } from 'redux-saga/effects';
import { kibanaService } from '../../../../utils/kibana_service';
import { MonitorOverviewPageState } from '../overview';
import { quietFetchOverviewAction } from '../overview/actions';
import { selectOverviewState } from '../overview/selectors';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { serializeHttpFetchError } from '../utils/http_error';
import {
  clearMonitorUpsertStatus,
  fetchMonitorListAction,
  fetchUpsertFailureAction,
  fetchUpsertMonitorAction,
  fetchUpsertSuccessAction,
  UpsertMonitorRequest,
} from './actions';
import { fetchMonitorManagementList, fetchUpsertMonitor } from './api';
import { toastTitle } from './toast_title';

export function* fetchMonitorListEffect() {
  yield takeLeading(
    fetchMonitorListAction.get,
    fetchEffectFactory(
      fetchMonitorManagementList,
      fetchMonitorListAction.success,
      fetchMonitorListAction.fail
    )
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
          fetchUpsertFailureAction({ id: action.payload.id, error: serializeHttpFetchError(error) })
        );
      } finally {
        if (action.payload.shouldQuietFetchAfterSuccess !== false) {
          const monitorState = yield select(selectOverviewState);
          if (hasPageState(monitorState)) {
            yield put(
              quietFetchOverviewAction.get(monitorState.pageState as MonitorOverviewPageState)
            );
          }
        }
        yield put(clearMonitorUpsertStatus(action.payload.id));
      }
    }
  );
}

function hasPageState(value: any): value is { pageState: MonitorOverviewPageState } {
  return Object.keys(value).includes('pageState');
}

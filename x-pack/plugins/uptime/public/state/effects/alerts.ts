/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action } from 'redux-actions';
import { call, put, takeLatest, select } from 'redux-saga/effects';

import { fetchEffectFactory } from './fetch_effect';
import { deleteAlertAction, getExistingAlertAction } from '../actions/alerts';
import { disableAlertById, fetchAlertRecords } from '../api/alerts';
import { kibanaService } from '../kibana_service';
import { monitorIdSelector } from '../selectors';

export function* fetchAlertsEffect() {
  yield takeLatest(
    getExistingAlertAction.get,
    fetchEffectFactory(
      fetchAlertRecords,
      getExistingAlertAction.success,
      getExistingAlertAction.fail
    )
  );

  yield takeLatest(
    String(deleteAlertAction.get),
    function* (action: Action<{ alertId: string }>): Generator {
      try {
        const response = yield call(disableAlertById, action.payload);
        yield put(deleteAlertAction.success(response));
        kibanaService.core.notifications.toasts.addSuccess('Alert successfully deleted!');
        const monitorId = (yield select(monitorIdSelector)) as ReturnType<typeof monitorIdSelector>;
        yield put(getExistingAlertAction.get({ monitorId }));
      } catch (err) {
        kibanaService.core.notifications.toasts.addError(err, {
          title: 'Alert cannot be deleted',
        });
        yield put(deleteAlertAction.fail(err));
      }
    }
  );
}

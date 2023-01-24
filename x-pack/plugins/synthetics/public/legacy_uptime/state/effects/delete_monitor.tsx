/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { put, call, takeEvery } from 'redux-saga/effects';
import { Action } from 'redux-actions';
import { i18n } from '@kbn/i18n';
import { deleteMonitorAction } from '../actions/delete_monitor';
import { deleteMonitor } from '../api';
import { kibanaService } from '../kibana_service';

export function* deleteMonitorEffect() {
  yield takeEvery(
    String(deleteMonitorAction.get),
    function* (action: Action<{ id: string; name: string }>) {
      try {
        const { id, name } = action.payload;
        yield call(deleteMonitor, { id });
        yield put(deleteMonitorAction.success(id));
        kibanaService.core.notifications.toasts.addSuccess({
          title: toMountPoint(
            <p data-test-subj="uptimeDeleteMonitorSuccess">
              {i18n.translate(
                'xpack.synthetics.monitorManagement.monitorDeleteSuccessMessage.name',
                {
                  defaultMessage: 'Deleted "{name}"',
                  values: { name },
                }
              )}
            </p>
          ),
        });
      } catch (err) {
        kibanaService.core.notifications.toasts.addError(err, {
          title: MONITOR_DELETE_FAILURE_LABEL,
        });
        yield put(deleteMonitorAction.fail({ id: action.payload.id, error: err }));
      }
    }
  );
}

const MONITOR_DELETE_FAILURE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.monitorDeleteFailureMessage',
  {
    defaultMessage: 'Monitor was unable to be deleted. Please try again later.',
  }
);

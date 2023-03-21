/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeEvery } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { manualTestMonitorAction } from './actions';
import { triggerTestNowMonitor } from './api';

export function* fetchManualTestRunsEffect() {
  yield takeEvery(
    manualTestMonitorAction.get,
    fetchEffectFactory(
      triggerTestNowMonitor,
      manualTestMonitorAction.success,
      manualTestMonitorAction.fail,
      '',
      FAILED_TEST
    )
  );
}

const FAILED_TEST = i18n.translate('xpack.synthetics.runTest.failure', {
  defaultMessage: 'Failed to run test manually',
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeEvery } from 'redux-saga/effects';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { TestNowResponse } from '../../../../common/types';
import { testNowMonitorAction } from '../actions';
import { triggerTestNowMonitor } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchTestNowMonitorEffect() {
  yield takeEvery(
    testNowMonitorAction.get,
    fetchEffectFactory(triggerTestNowMonitor, testNowMonitorSuccessAction, testNowMonitorFailAction)
  );
}

function testNowMonitorSuccessAction(payload: TestNowResponse | undefined) {
  return testNowMonitorAction.success(payload);
}

function testNowMonitorFailAction(payload: IHttpFetchError) {
  return testNowMonitorAction.fail(payload);
}

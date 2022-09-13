/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest, takeLeading } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import {
  fetchMonitorOverviewAction,
  fetchOverviewStatusAction,
  quietFetchOverviewAction,
} from './actions';
import { fetchMonitorOverview, fetchOverviewStatus } from './api';

export function* fetchMonitorOverviewEffect() {
  yield takeLeading(
    fetchMonitorOverviewAction.get,
    fetchEffectFactory(
      fetchMonitorOverview,
      fetchMonitorOverviewAction.success,
      fetchMonitorOverviewAction.fail
    )
  );
}

export function* quietFetchOverviewEffect() {
  yield takeLeading(
    quietFetchOverviewAction.get,
    fetchEffectFactory(
      fetchMonitorOverview,
      quietFetchOverviewAction.success,
      quietFetchOverviewAction.fail
    )
  );
}

export function* fetchOverviewStatusEffect() {
  yield takeLatest(
    fetchOverviewStatusAction.get,
    fetchEffectFactory(
      fetchOverviewStatus,
      fetchOverviewStatusAction.success,
      fetchOverviewStatusAction.fail
    )
  );
}

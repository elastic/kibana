/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorOverviewAction } from './actions';
import { fetchMonitorOverview } from './api';

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

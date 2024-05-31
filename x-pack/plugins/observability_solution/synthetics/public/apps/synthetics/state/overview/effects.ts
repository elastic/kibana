/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'redux-saga/effects';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorOverviewAction, quietFetchOverviewAction } from './actions';
import { fetchMonitorOverview } from './api';

export function* fetchMonitorOverviewEffect() {
  yield debounce(
    200, // Only take the latest while ignoring any intermediate triggers
    [fetchMonitorOverviewAction.get, quietFetchOverviewAction.get],
    fetchEffectFactory(
      fetchMonitorOverview,
      fetchMonitorOverviewAction.success,
      fetchMonitorOverviewAction.fail
    )
  );
}

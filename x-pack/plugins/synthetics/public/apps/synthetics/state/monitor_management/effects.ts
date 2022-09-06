/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { fetchMonitorListAction } from './monitor_list';
import { fetchMonitorManagementList, fetchServiceLocations } from './api';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchServiceLocationsAction } from './service_locations';

export function* fetchServiceLocationsEffect() {
  yield takeLeading(
    String(fetchServiceLocationsAction.get),
    fetchEffectFactory(
      fetchServiceLocations,
      fetchServiceLocationsAction.success,
      fetchServiceLocationsAction.fail
    )
  );
}

export function* fetchMonitorListEffect() {
  yield takeLeading(
    String(fetchMonitorListAction.get),
    fetchEffectFactory(
      fetchMonitorManagementList,
      fetchMonitorListAction.success,
      fetchMonitorListAction.fail
    )
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { getMonitorProfileAPI } from './api';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchMonitorProfileAction } from './actions';

export function* fetchProfilesEffect() {
  yield takeLeading(
    fetchMonitorProfileAction.get,
    fetchEffectFactory(
      getMonitorProfileAPI,
      fetchMonitorProfileAction.success,
      fetchMonitorProfileAction.fail
    ) as ReturnType<typeof fetchEffectFactory>
  );
}

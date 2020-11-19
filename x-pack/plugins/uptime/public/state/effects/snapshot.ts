/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLatest } from 'redux-saga/effects';
import {
  getSnapshotCountAction,
  getSnapshotCountActionFail,
  getSnapshotCountActionSuccess,
} from '../actions';
import { fetchSnapshotCount } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchSnapshotCountEffect() {
  yield takeLatest(
    getSnapshotCountAction,
    fetchEffectFactory(
      fetchSnapshotCount,
      getSnapshotCountActionSuccess,
      getSnapshotCountActionFail
    )
  );
}

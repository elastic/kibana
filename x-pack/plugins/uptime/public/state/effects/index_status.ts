/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { takeLeading } from 'redux-saga/effects';
import { indexStatusAction } from '../actions';
import { fetchIndexStatus } from '../api';
import { fetchEffectFactory } from './fetch_effect';

export function* fetchIndexStatusEffect() {
  yield takeLeading(
    indexStatusAction.get,
    fetchEffectFactory(fetchIndexStatus, indexStatusAction.success, indexStatusAction.fail)
  );
}

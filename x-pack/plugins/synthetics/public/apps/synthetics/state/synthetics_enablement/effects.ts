/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLatest, takeLeading } from 'redux-saga/effects';
import {
  getSyntheticsEnablement,
  getSyntheticsEnablementSuccess,
  getSyntheticsEnablementFailure,
  disableSynthetics,
  disableSyntheticsSuccess,
  disableSyntheticsFailure,
  enableSynthetics,
  enableSyntheticsSuccess,
  enableSyntheticsFailure,
} from './actions';
import { fetchGetSyntheticsEnablement, fetchDisableSynthetics, fetchEnableSynthetics } from './api';
import { fetchEffectFactory } from '../utils/fetch_effect';

export function* fetchSyntheticsEnablementEffect() {
  yield takeLeading(
    getSyntheticsEnablement,
    fetchEffectFactory(
      fetchGetSyntheticsEnablement,
      getSyntheticsEnablementSuccess,
      getSyntheticsEnablementFailure
    )
  );
  yield takeLatest(
    disableSynthetics,
    fetchEffectFactory(fetchDisableSynthetics, disableSyntheticsSuccess, disableSyntheticsFailure)
  );
  yield takeLatest(
    enableSynthetics,
    fetchEffectFactory(fetchEnableSynthetics, enableSyntheticsSuccess, enableSyntheticsFailure)
  );
}

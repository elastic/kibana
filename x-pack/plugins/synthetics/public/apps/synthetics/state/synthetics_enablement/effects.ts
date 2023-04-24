/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import {
  getSyntheticsEnablement,
  getSyntheticsEnablementSuccess,
  getSyntheticsEnablementFailure,
} from './actions';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { fetchGetSyntheticsEnablement } from './api';

export function* fetchSyntheticsEnablementEffect() {
  yield takeLeading(
    getSyntheticsEnablement,
    fetchEffectFactory(
      fetchGetSyntheticsEnablement,
      getSyntheticsEnablementSuccess,
      getSyntheticsEnablementFailure,
      undefined,
      failureMessage
    )
  );
}

const failureMessage = i18n.translate('xpack.synthetics.settings.enablement.fail', {
  defaultMessage: 'Failed to enable Monitor Management',
});

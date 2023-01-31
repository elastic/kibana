/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { enableDefaultAlertingAction, updateDefaultAlertingAction } from './actions';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { enableDefaultAlertingAPI, updateDefaultAlertingAPI } from './api';

export function* enableDefaultAlertingEffect() {
  yield takeLeading(
    enableDefaultAlertingAction.get,
    fetchEffectFactory(
      enableDefaultAlertingAPI,
      enableDefaultAlertingAction.success,
      enableDefaultAlertingAction.fail,
      successMessage,
      failureMessage
    )
  );
}

export function* updateDefaultAlertingEffect() {
  yield takeLeading(
    updateDefaultAlertingAction.get,
    fetchEffectFactory(
      updateDefaultAlertingAPI,
      updateDefaultAlertingAction.success,
      updateDefaultAlertingAction.fail,
      successMessage,
      failureMessage
    )
  );
}

const successMessage = i18n.translate('xpack.synthetics.settings.enableAlerting', {
  defaultMessage:
    'Monitor status rule type successfully updated. Next rule alerts will take the changes into account.',
});

const failureMessage = i18n.translate('xpack.synthetics.settings.enabledAlert.fail', {
  defaultMessage: 'Failed to update monitor status rule type.',
});

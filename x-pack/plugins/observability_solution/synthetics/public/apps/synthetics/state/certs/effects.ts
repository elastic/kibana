/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { takeLeading } from 'redux-saga/effects';
import { i18n } from '@kbn/i18n';
import { fetchEffectFactory } from '../utils/fetch_effect';
import { getCertsList } from './api';
import { getCertsListAction } from './actions';

export function* getCertsListEffect() {
  yield takeLeading(
    getCertsListAction.get,
    fetchEffectFactory(
      getCertsList,
      getCertsListAction.success,
      getCertsListAction.fail,
      undefined,
      getFailMessage
    )
  );
}

const getFailMessage = i18n.translate('xpack.synthetics.getCerts.failed', {
  defaultMessage: 'Failed to get TLS certificates.',
});

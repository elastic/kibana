/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import { takeLatest } from 'redux-saga/effects';
import { createAsyncAction } from '../actions/utils';
import { asyncInitState, handleAsyncAction } from '../reducers/utils';
import { CertResult, GetCertsParams } from '../../../common/runtime_types';
import { AppState } from '../index';
import { AsyncInitState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import { fetchCertificates } from '../api/certificates';

export const getCertificatesAction = createAsyncAction<GetCertsParams, CertResult>(
  'GET_CERTIFICATES'
);

interface CertificatesState {
  certs: AsyncInitState<CertResult>;
}

const initialState = {
  certs: asyncInitState(),
};

export const certificatesReducer = handleActions<CertificatesState>(
  {
    ...handleAsyncAction<CertificatesState>('certs', getCertificatesAction),
  },
  initialState
);

export function* fetchCertificatesEffect() {
  yield takeLatest(
    getCertificatesAction.get,
    fetchEffectFactory(fetchCertificates, getCertificatesAction.success, getCertificatesAction.fail)
  );
}

export const certificatesSelector = ({ certificates }: AppState) => certificates.certs;

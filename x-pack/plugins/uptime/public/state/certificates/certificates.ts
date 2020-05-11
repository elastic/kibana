/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { takeLatest } from 'redux-saga/effects';
import { createAsyncAction } from '../actions/utils';
import { getAsyncInitialState, handleAsyncAction } from '../reducers/utils';
import { CertResult, GetCertsParams } from '../../../common/runtime_types';
import { AppState } from '../index';
import { AsyncInitialState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import { fetchCertificates } from '../api/certificates';

export const getCertificatesAction = createAsyncAction<GetCertsParams, CertResult>(
  'GET_CERTIFICATES'
);

interface CertificatesState {
  certs: AsyncInitialState<CertResult>;
}

const initialState = {
  certs: getAsyncInitialState(),
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

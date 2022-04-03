/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Action, createAction, handleActions } from 'redux-actions';
import { AppState } from '../index';

export const setCertificatesTotalAction = createAction<CertificatesState>('SET_CERTIFICATES_TOTAL');

export interface CertificatesState {
  total: number;
}

const initialState = {
  total: 0,
};

export const certificatesReducer = handleActions<CertificatesState>(
  {
    [String(setCertificatesTotalAction)]: (state, action: Action<CertificatesState>) => ({
      ...state,
      total: action.payload.total,
    }),
  },
  initialState
);

export const certificatesSelector = ({ certificates }: AppState) => certificates.total;

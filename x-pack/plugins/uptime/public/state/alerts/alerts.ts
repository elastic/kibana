/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import { takeLatest } from 'redux-saga/effects';
import { createAsyncAction } from '../actions/utils';
import { getAsyncInitialState, handleAsyncAction } from '../reducers/utils';
import { AppState } from '../index';
import { AsyncInitialState } from '../reducers/types';
import { fetchEffectFactory } from '../effects/fetch_effect';
import { createAlert, fetchConnectors } from '../api/alerts';
import { ActionConnector as RawActionConnector } from '../../../../triggers_actions_ui/public';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const createAlertAction = createAsyncAction<{}, ActionConnector[]>('CREATE ALERT');
export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');

interface AlertState {
  connectors: AsyncInitialState<ActionConnector[]>;
  newAlert: AsyncInitialState<ActionConnector[]>;
}

const initialState = {
  connectors: getAsyncInitialState(),
  newAlert: getAsyncInitialState(),
};

export const alertReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
    ...handleAsyncAction<AlertState>('newAlert', createAlertAction),
  },
  initialState
);

export function* fetchConnectorsEffect() {
  yield takeLatest(
    getConnectorsAction.get,
    fetchEffectFactory(fetchConnectors, getConnectorsAction.success, getConnectorsAction.fail)
  );
  yield takeLatest(
    createAlertAction.get,
    fetchEffectFactory(createAlert, createAlertAction.success, createAlertAction.fail)
  );
}

export const connectorsSelector = ({ alerts }: AppState) => alerts.connectors;

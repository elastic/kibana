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
import { fetchConnectors } from '../api/alerts';
import { ActionConnector as RawActionConnector } from '../../../../triggers_actions_ui/public';

export type ActionConnector = Omit<RawActionConnector, 'secrets'>;

export const getConnectorsAction = createAsyncAction<{}, ActionConnector[]>('GET CONNECTORS');

interface AlertState {
  connectors: AsyncInitialState<ActionConnector[]>;
}

const initialState = {
  connectors: getAsyncInitialState(),
};

export const alertReducer = handleActions<AlertState>(
  {
    ...handleAsyncAction<AlertState>('connectors', getConnectorsAction),
  },
  initialState
);

export function* fetchConnectorsEffect() {
  yield takeLatest(
    getConnectorsAction.get,
    fetchEffectFactory(fetchConnectors, getConnectorsAction.success, getConnectorsAction.fail)
  );
}

export const connectorsSelector = ({ alerts }: AppState) => alerts.connectors;

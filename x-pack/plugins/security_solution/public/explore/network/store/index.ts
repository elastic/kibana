/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyAction, Reducer } from 'redux';
import * as networkActions from './actions';
import * as networkModel from './model';
import type { NetworkState } from './reducer';
import * as networkSelectors from './selectors';

export { networkActions, networkModel, networkSelectors };
export * from './reducer';

export interface NetworkPluginState {
  network: NetworkState;
}

export interface NetworkPluginReducer {
  network: Reducer<networkModel.NetworkModel, AnyAction>;
}

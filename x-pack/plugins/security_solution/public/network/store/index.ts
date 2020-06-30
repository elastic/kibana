/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer, AnyAction } from 'redux';
import * as networkActions from './actions';
import * as networkModel from './model';
import * as networkSelectors from './selectors';
import { NetworkState } from './reducer';

export { networkActions, networkModel, networkSelectors };
export * from './reducer';

export interface NetworkPluginState {
  network: NetworkState;
}

export interface NetworkPluginReducer {
  network: Reducer<networkModel.NetworkModel, AnyAction>;
}

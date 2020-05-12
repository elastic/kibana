/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer, AnyAction } from 'redux';
import * as hostsActions from './actions';
import * as hostsModel from './model';
import * as hostsSelectors from './selectors';

export { hostsActions, hostsModel, hostsSelectors };
export * from './reducer';

export interface HostsPluginState {
  hosts: hostsModel.HostsModel;
}

export interface HostsPluginReducer {
  hosts: Reducer<hostsModel.HostsModel, AnyAction>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Reducer, AnyAction } from 'redux';
import * as usersActions from './actions';
import * as usersModel from './model';
import * as usersSelectors from './selectors';

export { usersActions, usersModel, usersSelectors };
export * from './reducer';

export interface UsersPluginState {
  users: usersModel.UsersModel;
}

export interface UsersPluginReducer {
  users: Reducer<usersModel.UsersModel, AnyAction>;
}

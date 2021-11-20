/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Reducer, AnyAction } from 'redux';
import * as uebaActions from './actions';
import * as uebaModel from './model';
import * as uebaSelectors from './selectors';

export { uebaActions, uebaModel, uebaSelectors };
export * from './reducer';

export interface UebaPluginState {
  ueba: uebaModel.UebaModel;
}

export interface UebaPluginReducer {
  ueba: Reducer<uebaModel.UebaModel, AnyAction>;
}

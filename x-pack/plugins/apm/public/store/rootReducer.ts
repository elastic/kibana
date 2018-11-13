/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { reducer } from 'react-redux-request';
import { combineReducers } from 'redux';
import { StringMap } from '../../typings/common';
// @ts-ignore
import location from './location';
import { IUrlParams, urlParamsReducer } from './urlParams';

export interface IReduxState {
  location: any;
  urlParams: IUrlParams;
  reactReduxRequest: StringMap;
}

export const rootReducer = combineReducers({
  location,
  urlParams: urlParamsReducer,
  reactReduxRequest: reducer
});

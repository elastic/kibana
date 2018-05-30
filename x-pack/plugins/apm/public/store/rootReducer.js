/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import location from './location';
import sorting from './sorting';
import urlParams from './urlParams';
import { reducer } from 'react-redux-request';

const rootReducer = combineReducers({
  location,
  sorting,
  urlParams,
  reactReduxRequest: reducer
});

export default rootReducer;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules'; // eslint-disable-line no-unused-vars
import { combineReducers } from 'redux';
import ui from './ui';

const rootReducer = combineReducers({
  ui
});

const appConfigData = () => {

}
export default rootReducer;

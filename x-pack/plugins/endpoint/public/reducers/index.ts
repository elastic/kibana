/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { reducer as href } from './href';
import { reducer as alertList } from './alert_list';
import { reducer as alertDetails } from './alert_details';
import { endpointListReducer as endpointsList } from './endpoints_list';

// eslint-disable-next-line import/no-default-export
export default combineReducers({
  saga: href,
  alertList,
  alertDetails,
  endpointsList,
});

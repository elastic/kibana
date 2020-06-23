/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { nodes } from './nodes';
import { policies } from './policies';
import { general } from './general';

export const indexLifecycleManagement = combineReducers({
  nodes,
  policies,
  general,
});

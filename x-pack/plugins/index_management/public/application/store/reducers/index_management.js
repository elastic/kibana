/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { combineReducers } from 'redux';
import { indices } from './indices';
import { rowStatus } from './row_status';
import { tableState } from './table_state';

export const getReducer = () =>
  combineReducers({
    indices,
    rowStatus,
    tableState,
  });

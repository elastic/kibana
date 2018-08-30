/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import reduceReducers from 'reduce-reducers';
import { Reducer } from 'redux';

import { loadSourceReducer } from './operations/load';
import { SourceState } from './state';

export const sourceReducer = reduceReducers(loadSourceReducer) as Reducer<SourceState>;

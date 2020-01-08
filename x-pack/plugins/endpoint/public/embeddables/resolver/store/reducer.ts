/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Reducer, combineReducers } from 'redux';
import { cameraReducer } from './camera/reducer';
import { dataReducer } from './data/reducer';
import { ResolverState, ResolverAction } from '../types';

export const resolverReducer: Reducer<ResolverState, ResolverAction> = combineReducers({
  camera: cameraReducer,
  data: dataReducer,
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers } from 'redux';
import { ImmutableCombineReducers } from '../types';

/**
 * Works the same as `combineReducers` from `redux`, but uses the `ImmutableCombineReducers` type.
 */
export const immutableCombineReducers: ImmutableCombineReducers = combineReducers;

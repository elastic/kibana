/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rest from '../services/rest';
import { createActionTypes, createAction, createReducer } from './apiHelpers';

const actionTypes = createActionTypes('LICENSE');
export const [LICENSE_LOADING, LICENSE_SUCCESS, LICENSE_FAILURE] = actionTypes;

const INITIAL_DATA = {
  features: { watcher: { isAvailable: false } },
  license: { isActive: false }
};
const license = createReducer(actionTypes, INITIAL_DATA);
export const loadLicense = createAction(actionTypes, rest.loadLicense);

export default license;

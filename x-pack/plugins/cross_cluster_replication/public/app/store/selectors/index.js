/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

// Api
export const getApiState = (state) => state.api;
export const getApiStatus = (scope) => createSelector(getApiState, (api) => api.status[scope]);
export const getApiError = (scope) => createSelector(getApiState, (api) => api.error[scope]);

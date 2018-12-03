/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const setLoading = createAction('setResolvedLoading');
export const setValue = createAction('setResolvedValue');
export const setValues = createAction('setResolvedValues');
export const clear = createAction('clearResolvedValue');

export const inFlightActive = createAction('inFlightActive');
export const inFlightComplete = createAction('inFlightComplete');

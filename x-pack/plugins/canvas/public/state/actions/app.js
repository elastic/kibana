/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAction } from 'redux-actions';

// actions to set the application state
export const appReady = createAction('appReady');
export const appError = createAction('appError');
export const appUnload = createAction('appUnload');

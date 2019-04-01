/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const updateTimeFromDatePicker = createAction('updateTimeFromDatePicker', date => ({ date }));
export const updateRefreshIntervalFromDatePicker = createAction('updateRefreshIntervalFromDatePicker', date => ({ date }));
export const updateDateFromUrl = createAction('updateDateFromUrl', date => ({ date }));
export const fetchDate = createAction('fetchDate');


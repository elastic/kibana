/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { QueryParams } from './types';

export const getIndexPattern = createAction('GET_INDEX_PATTERN');
export const getIndexPatternSuccess = createAction<QueryParams>('GET_INDEX_PATTERN_SUCCESS');
export const getIndexPatternFail = createAction<Error>('GET_INDEX_PATTERN_FAIL');

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';
import { API_STATUS } from '../../constants';

export const apiAction = ({ label, scope, status, handler }) => ({ type: t.API, payload: { label, scope, status, handler } });

export const apiStart = ({ label, scope, status = API_STATUS.LOADING }) => ({ type: t.API_START, payload: { label, scope, status } });

export const apiEnd = ({ label, scope }) => ({ type: t.API_END, payload: { label, scope } });

export const setApiError = ({ error, scope }) => ({ type: t.API_ERROR_SET, payload: { error, scope } });

export const clearApiError = (scope) => ({ type: t.API_ERROR_SET, payload: { error: null, scope } });

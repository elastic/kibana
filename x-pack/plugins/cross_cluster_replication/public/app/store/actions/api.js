/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from '../action_types';

export const apiAction = ({ label, scope, handler }) => ({ type: t.API, payload: { label, scope, handler } });

export const apiStart = ({ label, scope }) => ({ type: t.API_START, payload: { label, scope } });

export const apiEnd = ({ label, scope }) => ({ type: t.API_END, payload: { label, scope } });

export const apiError = ({ error, scope }) => ({ type: t.API_ERROR, payload: { error, scope } });

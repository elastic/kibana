/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export const setBootstrapEnabled = createAction('SET_BOOTSTRAP_ENABLED');
export const setIndexName = createAction('SET_INDEX_NAME');
export const setAliasName = createAction('SET_ALIAS_NAME');

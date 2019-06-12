/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { RepositoryConfig } from '../../model';

export const loadConfigs = createAction('LOAD CONFIGS');
export const loadConfigsSuccess = createAction<{ [key: string]: RepositoryConfig }>(
  'LOAD CONFIGS SUCCESS'
);
export const loadConfigsFailed = createAction<Error>('LOAD CONFIGS FAILED');

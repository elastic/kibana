/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KeyUrlState } from './';

export enum CONSTANTS {
  kqlQuery = 'kqlQuery',
  timerange = 'timerange',
}

export const URL_STATE_KEYS: KeyUrlState[] = [CONSTANTS.kqlQuery, CONSTANTS.timerange];

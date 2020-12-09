/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BackgroundSessionStatus } from '../';

export const REFRESH_INTERVAL_MS = 3000;

export const EXPIRES_SOON_IN_DAYS = 2;

export const MAX_SEARCH_HITS = 10000;

export enum ACTION {
  EXTEND = 'extend',
  CANCEL = 'cancel',
  DELETE = 'delete',
}

export { BackgroundSessionStatus as STATUS };

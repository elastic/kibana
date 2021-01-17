/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ACTION } from './constants';
import { SearchSessionStatus } from '..';

export interface UISession {
  id: string;
  name: string;
  appId: string;
  created: string;
  expires: string | null;
  status: SearchSessionStatus;
  actions?: ACTION[];
  reloadUrl: string;
  restoreUrl: string;
}

export * from './constants';

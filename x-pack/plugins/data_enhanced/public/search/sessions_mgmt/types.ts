/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchSessionStatus } from '../../../common';
import { ACTION } from './components/actions';

export const DATE_STRING_FORMAT = 'D MMM, YYYY, HH:mm:ss';

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

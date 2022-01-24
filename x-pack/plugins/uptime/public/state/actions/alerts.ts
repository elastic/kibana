/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAsyncAction } from './utils';
import { MonitorIdParam } from './types';
import { Rule } from '../../../../triggers_actions_ui/public';

export const getExistingAlertAction = createAsyncAction<MonitorIdParam, Rule>(
  'GET EXISTING ALERTS'
);

export const deleteAlertAction = createAsyncAction<{ alertId: string }, any>('DELETE ALERTS');

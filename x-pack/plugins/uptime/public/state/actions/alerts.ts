/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAsyncAction } from './utils';
import { MonitorIdParam } from './types';
import { Alert } from '../../../../triggers_actions_ui/public';

export const getExistingAlertAction = createAsyncAction<MonitorIdParam, Alert>(
  'GET EXISTING ALERTS'
);

export const deleteAlertAction = createAsyncAction<{ alertId: string }, any>('DELETE ALERTS');

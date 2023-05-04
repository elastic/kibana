/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { createAsyncAction } from '../utils/actions';

export const enableDefaultAlertingAction = createAsyncAction<void, Rule>(
  'enableDefaultAlertingAction'
);

export const updateDefaultAlertingAction = createAsyncAction<void, Rule>(
  'updateDefaultAlertingAction'
);

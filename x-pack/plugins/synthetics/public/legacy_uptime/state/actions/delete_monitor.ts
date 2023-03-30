/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAsyncAction } from './utils';

export const deleteMonitorAction = createAsyncAction<
  { id: string; name: string },
  string,
  { id: string; error: Error }
>('DELETE_MONITOR');

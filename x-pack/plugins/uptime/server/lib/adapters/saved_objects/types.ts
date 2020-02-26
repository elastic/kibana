/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMSavedObjectsQueryFn } from '../framework';
import { DynamicSettings } from 'x-pack/legacy/plugins/uptime/common/runtime_types';

export interface UMSavedObjectsAdapter {
  getUptimeDynamicSettings: UMSavedObjectsQueryFn<DynamicSettings>;
  setUptimeDynamicSettings: UMSavedObjectsQueryFn<void, DynamicSettings>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  bulkGetMaintenanceWindowsErrorSchema,
  bulkGetMaintenanceWindowsResultSchema,
} from '../schemas';

export type BulkGetMaintenanceWindowsError = TypeOf<typeof bulkGetMaintenanceWindowsErrorSchema>;
export type BulkGetMaintenanceWindowsResult = TypeOf<typeof bulkGetMaintenanceWindowsResultSchema>;

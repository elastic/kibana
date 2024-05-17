/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { bulkGetBodySchemaV1 } from '..';
import { MaintenanceWindowResponseV1 } from '../../../response';

export type BulkGetMaintenanceWindowsRequestBody = TypeOf<typeof bulkGetBodySchemaV1>;

export interface BulkGetMaintenanceWindowsResponseBody {
  maintenance_windows: MaintenanceWindowResponseV1[];
  errors: Array<{
    id: string;
    error: string;
    message: string;
    status_code: number;
  }>;
}

export interface BulkGetMaintenanceWindowsResponse {
  body: BulkGetMaintenanceWindowsResponseBody;
}

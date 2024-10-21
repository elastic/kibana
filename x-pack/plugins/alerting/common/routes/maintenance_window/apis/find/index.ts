/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  findMaintenanceWindowsRequestQuerySchema,
  findMaintenanceWindowsResponseSchema,
} from './schemas/latest';
export type {
  FindMaintenanceWindowsRequestQuery,
  FindMaintenanceWindowsResponse,
} from './types/latest';

export {
  findMaintenanceWindowsRequestQuerySchema as findMaintenanceWindowsRequestQuerySchemaV1,
  findMaintenanceWindowsResponseSchema as findMaintenanceWindowsResponseSchemaV1,
} from './schemas/v1';
export type {
  FindMaintenanceWindowsRequestQuery as FindMaintenanceWindowsRequestQueryV1,
  FindMaintenanceWindowsResponse as FindMaintenanceWindowsResponseV1,
} from './types/v1';

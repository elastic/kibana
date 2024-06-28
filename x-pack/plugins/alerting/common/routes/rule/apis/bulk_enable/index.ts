/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkEnableBodySchema } from './schemas/latest';
export type { BulkEnableRulesRequestBody, BulkEnableRulesResponse } from './types/latest';

export { bulkEnableBodySchema as bulkEnableBodySchemaV1 } from './schemas/v1';
export type {
  BulkEnableRulesRequestBody as BulkEnableRulesRequestBodyV1,
  BulkEnableRulesResponse as BulkEnableRulesResponseV1,
} from './types/v1';

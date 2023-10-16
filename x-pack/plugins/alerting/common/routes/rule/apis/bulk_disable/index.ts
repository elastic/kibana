/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkDisableRulesRequestBodySchema } from './schemas/latest';
export { bulkDisableRulesRequestBodySchema as bulkDisableRulesRequestBodySchemaV1 } from './schemas/v1';

export type {
  BulkDisableRulesResponse,
  BulkOperationError,
  BulkDisableRulesRequestBody,
} from './types/latest';
export type {
  BulkDisableRulesResponse as BulkDisableRulesResponseV1,
  BulkOperationError as BulkOperationErrorV1,
  BulkDisableRulesRequestBody as BulkDisableRulesRequestBodyV1,
} from './types/v1';

export { validateBulkDisableRulesBody } from './validation/latest';
export { validateBulkDisableRulesBody as validateBulkDisableRulesBodyV1 } from './validation/v1';

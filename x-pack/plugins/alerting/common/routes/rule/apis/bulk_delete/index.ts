/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { bulkDeleteRulesRequestParamsSchema } from './schemas/latest';
export { bulkDeleteRulesRequestParamsSchema as bulkDeleteRulesRequestParamsSchemaV1 } from './schemas/v1';

export type {
  BulkDeleteRulesResponse,
  BulkOperationError,
  BulkDeleteRulesRequestParams,
} from './types/latest';
export type {
  BulkDeleteRulesResponse as BulkDeleteRulesResponseV1,
  BulkOperationError as BulkOperationErrorV1,
  BulkDeleteRulesRequestParams as BulkDeleteRulesRequestParamsV1,
} from './types/v1';

export { validateCommonBulkOptions } from './validation/latest';
export { validateCommonBulkOptions as validateCommonBulkOptionsV1 } from './validation/v1';

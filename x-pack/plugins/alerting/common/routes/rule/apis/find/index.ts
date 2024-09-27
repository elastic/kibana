/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { findRulesRequestQuerySchema } from './schemas/latest';
export type { FindRulesRequestQuery, FindRulesResponse } from './types/latest';

export {
  findRulesRequestQuerySchema as findRulesRequestQuerySchemaV1,
  findRulesInternalRequestQuerySchema as findRulesInternalRequestQuerySchemaV1,
} from './schemas/v1';

export type {
  FindRulesRequestQuery as FindRulesRequestQueryV1,
  FindRulesInternalRequestQuery as FindRulesInternalRequestQueryV1,
  FindRulesResponse as FindRulesResponseV1,
} from './types/latest';

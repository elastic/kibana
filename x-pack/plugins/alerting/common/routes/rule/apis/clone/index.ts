/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { cloneRuleRequestParamsSchema } from './schemas/latest';
export type { CloneRuleRequestParams, CloneRuleResponse } from './types/latest';

export { cloneRuleRequestParamsSchema as cloneRuleRequestParamsSchemaV1 } from './schemas/v1';
export type {
  CloneRuleRequestParams as CloneRuleRequestParamsV1,
  CloneRuleResponse as CloneRuleResponseV1,
} from './types/v1';

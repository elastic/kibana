/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ruleTagsRequestQuerySchema, ruleTagsFormattedResponseSchema } from './schemas/latest';
export type { RuleTagsRequestQuery, RuleTagsFormattedResponse } from './types/latest';

export {
  ruleTagsRequestQuerySchema as ruleTagsRequestQuerySchemaV1,
  ruleTagsFormattedResponseSchema as ruleTagsFormattedResponseSchemaV1,
} from './schemas/v1';
export type {
  RuleTagsRequestQuery as RuleTagsRequestQueryV1,
  RuleTagsFormattedResponse as RuleTagsFormattedResponseV1,
} from './types/v1';

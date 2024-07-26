/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { disableRuleRequestBodySchema, disableRuleRequestParamsSchema } from './schemas/latest';
export {
  disableRuleRequestBodySchema as disableRuleRequestBodySchemaV1,
  disableRuleRequestParamsSchema as disableRuleRequestParamsSchemaV1,
} from './schemas/v1';

export type { DisableRuleRequestBody, DisableRuleRequestParams } from './types/latest';
export type {
  DisableRuleRequestBody as DisableRuleRequestBodyV1,
  DisableRuleRequestParams as DisableRuleRequestParamsV1,
} from './types/v1';

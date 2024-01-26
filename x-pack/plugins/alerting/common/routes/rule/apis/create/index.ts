/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  actionFrequencySchema,
  actionAlertsFilterSchema,
  actionSchema,
  createParamsSchema,
  createBodySchema,
} from './schemas/latest';

export type {
  CreateRuleAction,
  CreateRuleActionFrequency,
  CreateRuleRequestParams,
  CreateRuleRequestBody,
  CreateRuleResponse,
} from './types/latest';

export {
  actionFrequencySchema as actionFrequencySchemaV1,
  actionAlertsFilterSchema as actionAlertsFilterSchemaV1,
  actionSchema as actionSchemaV1,
  createParamsSchema as createParamsSchemaV1,
  createBodySchema as createBodySchemaV1,
} from './schemas/v1';

export type {
  CreateRuleAction as CreateRuleActionV1,
  CreateRuleActionFrequency as CreateRuleActionFrequencyV1,
  CreateRuleRequestParams as CreateRuleRequestParamsV1,
  CreateRuleRequestBody as CreateRuleRequestBodyV1,
  CreateRuleResponse as CreateRuleResponseV1,
} from './types/v1';

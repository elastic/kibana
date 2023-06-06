/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { ruleV1 } from '..';
import { createRuleSchemasV1 } from '../../../api_schemas';

export type CreateRuleAction = TypeOf<typeof createRuleSchemasV1.actionSchema>;
export type CreateRuleActionFrequency = TypeOf<typeof createRuleSchemasV1.actionFrequencySchema>;

export type CreateRuleRequestParams = TypeOf<typeof createRuleSchemasV1.createParamsSchema>;
export type CreateRuleRequestBody = TypeOf<typeof createRuleSchemasV1.createBodySchema>;

export interface CreateRuleResponse<Params extends ruleV1.RuleParams = never> {
  body: ruleV1.RuleResponse<Params>;
}

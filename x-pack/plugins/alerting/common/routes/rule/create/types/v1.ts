/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1, RuleResponseV1 } from '../../rule_response';
import {
  actionSchema as actionSchemaV1,
  actionFrequencySchema as actionFrequencySchemaV1,
  createParamsSchema as createParamsSchemaV1,
  createBodySchema as createBodySchemaV1,
} from '..';

export type CreateRuleAction = TypeOf<typeof actionSchemaV1>;
export type CreateRuleActionFrequency = TypeOf<typeof actionFrequencySchemaV1>;

export type CreateRuleRequestParams = TypeOf<typeof createParamsSchemaV1>;
export type CreateRuleRequestBody = TypeOf<typeof createBodySchemaV1>;

export interface CreateRuleResponse<Params extends RuleParamsV1 = never> {
  body: RuleResponseV1<Params>;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';
import {
  actionSchemaV1,
  actionFrequencySchemaV1,
  createParamsSchemaV1,
  createBodySchemaV1,
} from '..';

export type CreateRuleAction = TypeOf<typeof actionSchemaV1>;
export type CreateRuleActionFrequency = TypeOf<typeof actionFrequencySchemaV1>;

export type CreateRuleRequestParams = TypeOf<typeof createParamsSchemaV1>;
type CreateBodySchema = TypeOf<typeof createBodySchemaV1>;

export interface CreateRuleRequestBody<Params extends RuleParamsV1 = never> {
  name: CreateBodySchema['name'];
  rule_type_id: CreateBodySchema['rule_type_id'];
  enabled: CreateBodySchema['enabled'];
  consumer: CreateBodySchema['consumer'];
  tags: CreateBodySchema['tags'];
  throttle?: CreateBodySchema['throttle'];
  params: Params;
  schedule: CreateBodySchema['schedule'];
  actions: CreateBodySchema['actions'];
  notify_when?: CreateBodySchema['notify_when'];
  alert_delay?: CreateBodySchema['alert_delay'];
}

export interface CreateRuleResponse<Params extends RuleParamsV1 = never> {
  body: RuleResponseV1<Params>;
}

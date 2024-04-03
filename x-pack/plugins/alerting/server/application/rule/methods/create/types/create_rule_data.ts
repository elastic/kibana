/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { createRuleDataSchema, defaultActionSchema, systemActionSchema } from '../schemas';
import { RuleParams } from '../../../types';

type CreateRuleDataType = TypeOf<typeof createRuleDataSchema>;
type CreateRuleActionDataType = TypeOf<typeof defaultActionSchema>;
type CreateRuleSystemActionDataType = TypeOf<typeof systemActionSchema>;

export interface CreateRuleData<Params extends RuleParams = never> {
  name: CreateRuleDataType['name'];
  alertTypeId: CreateRuleDataType['alertTypeId'];
  enabled: CreateRuleDataType['enabled'];
  consumer: CreateRuleDataType['consumer'];
  tags: CreateRuleDataType['tags'];
  throttle?: CreateRuleDataType['throttle'];
  params: Params;
  schedule: CreateRuleDataType['schedule'];
  actions: CreateRuleActionDataType[];
  systemActions?: CreateRuleSystemActionDataType[];
  notifyWhen?: CreateRuleDataType['notifyWhen'];
  alertDelay?: CreateRuleDataType['alertDelay'];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { createRuleDataSchema } from '../schemas';
import { RuleParams } from '../../../types';

type CreateRuleDataType = TypeOf<typeof createRuleDataSchema>;

export interface CreateRuleData<Params extends RuleParams = never> {
  name: CreateRuleDataType['name'];
  alertTypeId: CreateRuleDataType['alertTypeId'];
  enabled: CreateRuleDataType['enabled'];
  consumer: CreateRuleDataType['consumer'];
  tags: CreateRuleDataType['tags'];
  params: Params;
  schedule: CreateRuleDataType['schedule'];
  actions: CreateRuleDataType['actions'];
  alertDelay?: CreateRuleDataType['alertDelay'];
  /**
   * @deprecated Use action-level `notifyWhen` instead *
   */
  notifyWhen?: CreateRuleDataType['notifyWhen'];
  /**
   * @deprecated Use action-level `throttle` instead *
   */
  throttle?: CreateRuleDataType['throttle'];
}

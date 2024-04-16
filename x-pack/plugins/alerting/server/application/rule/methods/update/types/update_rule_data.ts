/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import { updateRuleDataSchema } from '../schemas';
import { RuleParams } from '../../../types';

type UpdateRuleDataType = TypeOf<typeof updateRuleDataSchema>;

export interface UpdateRuleData<Params extends RuleParams = never> {
  name: UpdateRuleDataType['name'];
  tags: UpdateRuleDataType['tags'];
  throttle?: UpdateRuleDataType['throttle'];
  params: Params;
  schedule: UpdateRuleDataType['schedule'];
  actions: UpdateRuleDataType['actions'];
  systemActions?: UpdateRuleDataType['systemActions'];
  notifyWhen?: UpdateRuleDataType['notifyWhen'];
  alertDelay?: UpdateRuleDataType['alertDelay'];
}

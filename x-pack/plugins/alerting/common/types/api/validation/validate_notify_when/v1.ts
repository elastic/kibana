/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleV1 } from '../..';

export function validateNotifyWhenType(notifyWhen: string) {
  if (Object.values(ruleV1.RuleNotifyWhen).includes(notifyWhen as ruleV1.RuleNotifyWhen)) {
    return;
  }
  return `string is not a valid RuleNotifyWhenType: ${notifyWhen}`;
}

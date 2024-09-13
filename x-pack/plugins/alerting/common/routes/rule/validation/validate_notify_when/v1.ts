/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleNotifyWhenV1, RuleNotifyWhenV1 } from '../../common';

export function validateNotifyWhen(notifyWhen: string) {
  if (Object.values(ruleNotifyWhenV1).includes(notifyWhen as RuleNotifyWhenV1)) {
    return;
  }
  return `string is not a valid RuleNotifyWhenType: ${notifyWhen}`;
}

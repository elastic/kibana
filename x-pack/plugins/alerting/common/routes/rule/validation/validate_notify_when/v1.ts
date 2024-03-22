/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';
import { ruleNotifyWhenV1, RuleNotifyWhenV1 } from '../../common';

export function validateNotifyWhen(notifyWhen: string, zodRefinementCtx?: RefinementCtx) {
  if (Object.values(ruleNotifyWhenV1).includes(notifyWhen as RuleNotifyWhenV1)) {
    return;
  }

  const message = `string is not a valid RuleNotifyWhenType: ${notifyWhen}`;

  if (zodRefinementCtx) {
    zodRefinementCtx.addIssue({
      code: ZodIssueCode.custom,
      message,
      fatal: true,
    });

    return NEVER;
  }
  return message;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefinementCtx, z } from '@kbn/zod/src/zod';

export function validateHours(time: string, ctx?: RefinementCtx) {
  if (/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
    return;
  }
  if (ctx) {
    ctx.addIssue({
      code: z.ZodIssueCode.invalid_string,
      validation: 'regex',
      message: 'string is not a valid time in HH:mm format ' + time,
    });
  }
  return 'string is not a valid time in HH:mm format ' + time;
}

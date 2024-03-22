/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import 'moment-timezone';
import { NEVER, RefinementCtx, ZodIssueCode } from 'zod';

export function validateTimezone(timezone: string, zodRefinementCtx?: RefinementCtx) {
  if (moment.tz.names().includes(timezone)) {
    return;
  }
  const message = `string is not a valid timezone: ${timezone}`;

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

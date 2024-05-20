/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createValidateRruleBy } from '../../lib/validate_rrule_by';
import { validateSnoozeStartDate, validateSnoozeEndDate } from '../../lib/validate_snooze_date';

export const rRuleSchema = schema.object({
  dtstart: schema.string({ validate: validateSnoozeStartDate }),
  tzid: schema.string(),
  freq: schema.maybe(
    schema.number({
      validate: (freq: number) => {
        if (freq < 0 || freq > 3) return 'rRule freq must be 0, 1, 2, or 3';
      },
    })
  ),
  interval: schema.maybe(
    schema.number({
      validate: (interval: number) => {
        if (interval < 1) return 'rRule interval must be > 0';
      },
    })
  ),
  until: schema.maybe(schema.string({ validate: validateSnoozeEndDate })),
  count: schema.maybe(
    schema.number({
      validate: (count: number) => {
        if (count < 1) return 'rRule count must be > 0';
      },
    })
  ),
  byweekday: schema.maybe(
    schema.arrayOf(schema.string(), {
      validate: createValidateRruleBy('byweekday'),
    })
  ),
  bymonthday: schema.maybe(
    schema.arrayOf(schema.number(), {
      validate: createValidateRruleBy('bymonthday'),
    })
  ),
  bymonth: schema.maybe(
    schema.arrayOf(schema.number(), {
      validate: createValidateRruleBy('bymonth'),
    })
  ),
});

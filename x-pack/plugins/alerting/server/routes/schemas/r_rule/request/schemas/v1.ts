/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  validateStartDateV1,
  validateEndDateV1,
  createValidateRecurrenceByV1,
} from '../../validation';

export const rRuleRequestSchema = schema.object({
  dtstart: schema.string({ validate: validateStartDateV1 }),
  tzid: schema.string(),
  freq: schema.maybe(
    schema.oneOf([schema.literal(0), schema.literal(1), schema.literal(2), schema.literal(3)])
  ),
  interval: schema.maybe(
    schema.number({
      validate: (interval: number) => {
        if (interval < 1) return 'rRule interval must be > 0';
      },
    })
  ),
  until: schema.maybe(schema.string({ validate: validateEndDateV1 })),
  count: schema.maybe(
    schema.number({
      validate: (count: number) => {
        if (count < 1) return 'rRule count must be > 0';
      },
    })
  ),
  byweekday: schema.maybe(
    schema.arrayOf(schema.string(), {
      validate: createValidateRecurrenceByV1('byweekday'),
    })
  ),
  bymonthday: schema.maybe(
    schema.arrayOf(schema.number(), {
      validate: createValidateRecurrenceByV1('bymonthday'),
    })
  ),
  bymonth: schema.maybe(
    schema.arrayOf(schema.number(), {
      validate: createValidateRecurrenceByV1('bymonth'),
    })
  ),
});

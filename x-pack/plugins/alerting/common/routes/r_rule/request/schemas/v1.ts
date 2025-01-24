/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateTimezone } from '../../../rule/validation/validate_timezone/v1';
import {
  validateStartDateV1,
  validateEndDateV1,
<<<<<<< HEAD:x-pack/plugins/alerting/common/routes/r_rule/request/schemas/v1.ts
  createValidateRecurrenceByV1,
=======
  validateRecurrenceByWeekdayV1,
>>>>>>> 9a3fc89629e ([ResponseOps][Rules] Validate timezone in rule routes (#201508)):x-pack/platform/plugins/shared/alerting/common/routes/r_rule/request/schemas/v1.ts
} from '../../validation';

export const rRuleRequestSchema = schema.object({
  dtstart: schema.string({ validate: validateStartDateV1 }),
  tzid: schema.string({ validate: validateTimezone }),
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
<<<<<<< HEAD:x-pack/plugins/alerting/common/routes/r_rule/request/schemas/v1.ts
    schema.arrayOf(
      schema.oneOf([
        schema.literal('MO'),
        schema.literal('TU'),
        schema.literal('WE'),
        schema.literal('TH'),
        schema.literal('FR'),
        schema.literal('SA'),
        schema.literal('SU'),
      ]),
      {
        validate: createValidateRecurrenceByV1('byweekday'),
      }
    )
=======
    schema.arrayOf(schema.string(), {
      minSize: 1,
      validate: validateRecurrenceByWeekdayV1,
    })
>>>>>>> 9a3fc89629e ([ResponseOps][Rules] Validate timezone in rule routes (#201508)):x-pack/platform/plugins/shared/alerting/common/routes/r_rule/request/schemas/v1.ts
  ),
  bymonthday: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 31 }), { minSize: 1 })),
  bymonth: schema.maybe(schema.arrayOf(schema.number({ min: 1, max: 12 }), { minSize: 1 })),
});

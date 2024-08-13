/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rRuleRequestSchemaV1 } from '../../../r_rule';
import { validateSnoozeSchedule } from '../../validation/validate_snooze_schedule/v1';

export const ruleSnoozeScheduleSchema = schema.object(
  {
    id: schema.maybe(schema.string()),
    duration: schema.number(),
    rRule: rRuleRequestSchemaV1,
  },
  { validate: validateSnoozeSchedule }
);

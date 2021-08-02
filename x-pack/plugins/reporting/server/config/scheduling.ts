/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const ScheduleIntervalSchema = schema.oneOf([
  schema.object({ minute: schema.number({ min: 10, max: 59 }) }),
  schema.object({ hour: schema.number({ min: 1, max: 23 }) }),
  schema.object({ day: schema.number({ min: 1, max: 31 }) }),
]);

export type ScheduleIntervalSchemaType = TypeOf<typeof ScheduleIntervalSchema>;

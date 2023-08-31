/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const schedulePerMinuteValidation = (value: number) => {
  if (value < 0) {
    return `schedule per minute cannot be negative: ${value}`;
  }
};

export const getSchemaFrequencyResultSchema = schema.object({
  totalScheduledPerMinute: schema.number({ validate: schedulePerMinuteValidation }),
  remainingSchedulesPerMinute: schema.number({ validate: schedulePerMinuteValidation }),
});

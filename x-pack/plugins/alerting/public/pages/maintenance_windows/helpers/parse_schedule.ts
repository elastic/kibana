/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecurringScheduleFormProps } from '../components/schema';

export const parseSchedule = (
  schedule: RecurringScheduleFormProps | undefined
): RecurringScheduleFormProps | undefined => {
  if (!schedule) {
    return schedule;
  }

  const { frequency, customFrequency, interval, count } = schedule;

  // We must case them to unknown because form-lib is already turning them into strings
  // despite what our types suggests
  const parsedFrequency = parseInt(frequency as string, 10);
  const parsedCustomFrequency = parseInt(customFrequency as unknown as string, 10);
  const parsedInterval = parseInt(interval as unknown as string, 10);
  const parsedCount = parseInt(count as unknown as string, 10);

  const shallowCopy = { ...schedule };

  if (!isNaN(parsedFrequency)) {
    shallowCopy.frequency = parsedFrequency;
  }

  if (!isNaN(parsedCustomFrequency)) {
    shallowCopy.customFrequency = parsedCustomFrequency;
  }

  if (!isNaN(parsedInterval)) {
    shallowCopy.interval = parsedInterval;
  }

  if (!isNaN(parsedCount)) {
    shallowCopy.count = parsedCount;
  }

  return shallowCopy;
};

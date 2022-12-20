/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertNever } from '@kbn/std';
import { Duration, DurationUnit } from '../../typings';

export function toDuration(duration: string): Duration {
  const durationValue = duration.substring(0, duration.length - 1);
  const durationUnit = duration.substring(duration.length - 1);

  return { value: parseInt(durationValue, 10), unit: durationUnit as DurationUnit };
}

export function toMinutes(duration: Duration) {
  switch (duration.unit) {
    case 'm':
      return duration.value;
    case 'h':
      return duration.value * 60;
    case 'd':
      return duration.value * 24 * 60;
    case 'w':
      return duration.value * 7 * 24 * 60;
    case 'M':
      return duration.value * 30 * 24 * 60;
    case 'Y':
      return duration.value * 365 * 24 * 60;
  }

  assertNever(duration.unit);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration, DurationUnit } from '../../../domain/models';

export function sevenDays(): Duration {
  return new Duration(7, DurationUnit.Day);
}

export function oneWeek(): Duration {
  return new Duration(1, DurationUnit.Week);
}

export function sixHours(): Duration {
  return new Duration(6, DurationUnit.Hour);
}

export function oneMinute(): Duration {
  return new Duration(1, DurationUnit.Minute);
}

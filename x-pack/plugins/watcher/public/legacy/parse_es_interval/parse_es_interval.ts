/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath, { Unit } from '@elastic/datemath';

import { InvalidEsCalendarIntervalError } from './invalid_es_calendar_interval_error';
import { InvalidEsIntervalFormatError } from './invalid_es_interval_format_error';

const ES_INTERVAL_STRING_REGEX = new RegExp(
  '^([1-9][0-9]*)\\s*(' + dateMath.units.join('|') + ')$'
);

export type ParsedInterval = ReturnType<typeof parseEsInterval>;

/**
 * Extracts interval properties from an ES interval string. Disallows unrecognized interval formats
 * and fractional values. Converts some intervals from "calendar" to "fixed" when the number of
 * units is larger than 1, and throws an error for others.
 *
 * Conversion rules:
 *
 * | Interval | Single unit type | Multiple units type |
 * | -------- | ---------------- | ------------------- |
 * | ms       | fixed            | fixed               |
 * | s        | fixed            | fixed               |
 * | m        | calendar         | fixed               |
 * | h        | calendar         | fixed               |
 * | d        | calendar         | fixed               |
 * | w        | calendar         | N/A - disallowed    |
 * | M        | calendar         | N/A - disallowed    |
 * | y        | calendar         | N/A - disallowed    |
 *
 */
export function parseEsInterval(interval: string) {
  const matches = String(interval).trim().match(ES_INTERVAL_STRING_REGEX);

  if (!matches) {
    throw new InvalidEsIntervalFormatError(interval);
  }

  const value = parseFloat(matches[1]);
  const unit = matches[2] as Unit;
  const type = dateMath.unitsMap[unit].type;

  if (type === 'calendar' && value !== 1) {
    throw new InvalidEsCalendarIntervalError(interval, value, unit, type);
  }

  return {
    value,
    unit,
    type:
      (type === 'mixed' && value === 1) || type === 'calendar'
        ? ('calendar' as 'calendar')
        : ('fixed' as 'fixed'),
  };
}

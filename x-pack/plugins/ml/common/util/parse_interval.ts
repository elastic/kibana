/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { duration, Duration, unitOfTime } from 'moment';
import dateMath from '@elastic/datemath';

type SupportedUnits = unitOfTime.Base;

// Assume interval is in the form (value)(unit), such as "1h"
const INTERVAL_STRING_RE = new RegExp('^([0-9]*)\\s*(' + dateMath.units.join('|') + ')$');

// moment.js is only designed to allow fractional values between 0 and 1
// for units of hour or less.
const SUPPORT_ZERO_DURATION_UNITS: SupportedUnits[] = ['ms', 's', 'm', 'h'];

// Parses an interval String, such as 7d, 1h or 30m to a moment duration.
// Differs from the Kibana ui/utils/parse_interval in the following ways:
// 1. A value-less interval such as 'm' is not allowed - in line with the ML back-end
// not accepting such interval Strings for the bucket span of a job.
// 2.  Zero length durations 0ms, 0s, 0m and 0h are accepted as-is.
// Note that when adding or subtracting fractional durations, moment is only designed
// to work with units less than 'day'.
// 3. Fractional intervals e.g. 1.5h or 4.5d are not allowed, in line with the behaviour
// of the Elasticsearch date histogram aggregation.
export function parseInterval(interval: string): Duration | null {
  const matches = String(interval)
    .trim()
    .match(INTERVAL_STRING_RE);
  if (!Array.isArray(matches) || matches.length < 3) {
    return null;
  }

  try {
    const value = parseInt(matches[1], 10);
    const unit = matches[2] as SupportedUnits;

    // In line with moment.js, only allow zero value intervals when the unit is less than 'day'.
    // And check for isNaN as e.g. valueless 'm' will pass the regex test.
    if (isNaN(value) || (value < 1 && SUPPORT_ZERO_DURATION_UNITS.indexOf(unit) === -1)) {
      return null;
    }

    return duration(value, unit);
  } catch (e) {
    return null;
  }
}

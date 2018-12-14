/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  formatHumanReadableDate,
  formatHumanReadableDateTime,
  formatHumanReadableDateTimeSeconds,
} from './date_utils';

describe('formatHumanReadableDate', () => {
  test('formatHumanReadableDate', () => {
    const formattedDate = formatHumanReadableDate(0);
    expect(formattedDate).toBe('January 1st 1970');
  });
  test('formatHumanReadableDateTime', () => {
    const formattedDate = formatHumanReadableDateTime(0);
    expect(formattedDate).toBe('January 1st 1970, 01:00');
  });
  test('formatHumanReadableDateTimeSeconds', () => {
    const formattedDate = formatHumanReadableDateTimeSeconds(0);
    expect(formattedDate).toBe('January 1st 1970, 01:00:00');
  });
});

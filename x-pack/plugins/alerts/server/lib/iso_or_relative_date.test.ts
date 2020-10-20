/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parseIsoOrRelativeDate } from './iso_or_relative_date';

describe('parseIsoOrRelativeDate', () => {
  test('handles ISO dates', () => {
    const date = new Date();
    const parsedDate = parseIsoOrRelativeDate(date.toISOString());
    expect(parsedDate?.valueOf()).toBe(date.valueOf());
  });

  test('handles relative dates', () => {
    const hoursDiff = 1;
    const date = new Date(Date.now() - hoursDiff * 60 * 60 * 1000);
    const parsedDate = parseIsoOrRelativeDate(`${hoursDiff}h`);
    const diff = Math.abs(parsedDate!.valueOf() - date.valueOf());
    expect(diff).toBeLessThan(1000);
  });

  test('returns undefined for invalid date strings', () => {
    const parsedDate = parseIsoOrRelativeDate('this shall not pass');
    expect(parsedDate).toBeUndefined();
  });
});

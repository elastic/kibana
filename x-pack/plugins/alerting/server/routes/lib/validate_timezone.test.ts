/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateTimezone } from './validate_timezone';

describe('validateTimeZone', () => {
  it('returns void for a valid timezone', () => {
    expect(validateTimezone('Europe/Berlin')).toBe(void 0);
  });

  it('returns void for UTC timezone', () => {
    expect(validateTimezone('UTC')).toBe(void 0);
  });

  it('returns an error message for an invalid timezone', () => {
    expect(validateTimezone('foo')).toBe('string is not a valid timezone: foo');
  });
});

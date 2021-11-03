/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEPRECATION_WARNING_UPPER_LIMIT } from '../../../common/constants';
import { validateRegExpString, getDeprecationsUpperLimit } from './utils';

describe('validRegExpString', () => {
  it('correctly returns false for invalid strings', () => {
    expect(validateRegExpString('?asd')).toContain(`Invalid regular expression`);
    expect(validateRegExpString('*asd')).toContain(`Invalid regular expression`);
    expect(validateRegExpString('(')).toContain(`Invalid regular expression`);
  });

  it('correctly returns true for valid strings', () => {
    expect(validateRegExpString('asd')).toBe('');
    expect(validateRegExpString('.*asd')).toBe('');
    expect(validateRegExpString('')).toBe('');
  });
});

describe('getDeprecationsUpperLimit', () => {
  it('correctly returns capped number if it goes above limit', () => {
    expect(getDeprecationsUpperLimit(1000000)).toBe(`${DEPRECATION_WARNING_UPPER_LIMIT}+`);
    expect(getDeprecationsUpperLimit(2000000)).toBe(`${DEPRECATION_WARNING_UPPER_LIMIT}+`);
  });

  it('correctly returns true for valid strings', () => {
    expect(getDeprecationsUpperLimit(10)).toBe('10');
    expect(getDeprecationsUpperLimit(DEPRECATION_WARNING_UPPER_LIMIT)).toBe(
      DEPRECATION_WARNING_UPPER_LIMIT.toString()
    );
  });
});

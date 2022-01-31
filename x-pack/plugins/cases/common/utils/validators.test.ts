/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmptyString } from './validators';

describe('validators', () => {
  describe('isEmptyString', () => {
    it('validates an empty string correctly', () => {
      expect(isEmptyString(' ')).toBe(true);
    });

    it('validates a string of length zero correctly', () => {
      expect(isEmptyString('')).toBe(true);
    });

    it('returns false if the string is not empty', () => {
      expect(isEmptyString('string')).toBe(false);
    });

    it('returns false if the string contains spaces', () => {
      // Ending space has been put intentionally
      expect(isEmptyString('my string ')).toBe(false);
    });
  });
});

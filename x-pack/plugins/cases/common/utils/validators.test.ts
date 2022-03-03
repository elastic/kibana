/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isInvalidTag } from './validators';

describe('validators', () => {
  describe('isInvalidTag', () => {
    it('validates a whitespace correctly', () => {
      expect(isInvalidTag(' ')).toBe(true);
    });

    it('validates an empty string correctly', () => {
      expect(isInvalidTag('')).toBe(true);
    });

    it('returns false if the string is not empty', () => {
      expect(isInvalidTag('string')).toBe(false);
    });

    it('returns false if the string contains spaces', () => {
      // Ending space has been put intentionally
      expect(isInvalidTag('my string ')).toBe(false);
    });
  });
});

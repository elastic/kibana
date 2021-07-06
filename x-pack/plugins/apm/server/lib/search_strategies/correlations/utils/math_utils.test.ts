/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomInt } from './math_utils';

describe('math utils', () => {
  describe('getRandomInt', () => {
    it('returns a random integer within the given range', () => {
      const min = 0.9;
      const max = 11.1;
      const randomInt = getRandomInt(min, max);
      expect(Number.isInteger(randomInt)).toBe(true);
      expect(randomInt > min).toBe(true);
      expect(randomInt < max).toBe(true);
    });

    it('returns 1 if given range only allows this integer', () => {
      const randomInt = getRandomInt(0.9, 1.1);
      expect(randomInt).toBe(1);
    });
  });
});

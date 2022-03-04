/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isStep1Open, isStep2Open } from './helpers';

describe('helpers', () => {
  describe('isStep1Open', () => {
    it('returns false when the delay has elapsed, and step 1 has completed', () => {
      expect(isStep1Open({ delayElapsed: true, tourStep1Completed: true })).toBe(false);
    });

    it('returns true when the delay has elapsed, and step 1 has NOT completed', () => {
      expect(isStep1Open({ delayElapsed: true, tourStep1Completed: false })).toBe(true);
    });

    it('returns false when the delay has NOT elapsed, and step 1 has completed', () => {
      expect(isStep1Open({ delayElapsed: false, tourStep1Completed: true })).toBe(false);
    });

    it('returns false when the delay has NOT elapsed, and step 1 has NOT completed', () => {
      expect(isStep1Open({ delayElapsed: false, tourStep1Completed: false })).toBe(false);
    });
  });

  describe('isStep2Open', () => {
    it('returns false when step 1 has completed, and step 2 has completed', () => {
      expect(isStep2Open({ tourStep1Completed: true, tourStep2Completed: true })).toBe(false);
    });

    it('returns true when step 1 has completed, and step 2 has NOT completed', () => {
      expect(isStep2Open({ tourStep1Completed: true, tourStep2Completed: false })).toBe(true);
    });

    it('returns false when step 1 has NOT completed, and step 2 has completed', () => {
      expect(isStep2Open({ tourStep1Completed: false, tourStep2Completed: true })).toBe(false);
    });

    it('returns false when step 1 has NOT completed, and step 2 has NOT completed', () => {
      expect(isStep2Open({ tourStep1Completed: false, tourStep2Completed: false })).toBe(false);
    });
  });
});

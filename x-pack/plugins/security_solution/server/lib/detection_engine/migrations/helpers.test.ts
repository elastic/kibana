/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isOutdated } from './helpers';

describe('signals migration helpers', () => {
  describe('isOutdated', () => {
    it('is true when current less than target', () => {
      expect(isOutdated({ current: 1, target: 2 })).toBe(true);
    });

    it('is false when current is equal to target', () => {
      expect(isOutdated({ current: 2, target: 2 })).toBe(false);
    });

    it('is false when current is greater than target', () => {
      expect(isOutdated({ current: 3, target: 2 })).toBe(false);
    });
  });
});

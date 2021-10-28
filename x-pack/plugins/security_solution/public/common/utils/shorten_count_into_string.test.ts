/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shortenCountIntoString } from './shorten_count_into_string';

describe('utils', () => {
  describe('shortenCountIntoString', () => {
    it('should not change small numbers', () => {
      expect(shortenCountIntoString(0)).toBe('0');
      expect(shortenCountIntoString(9999)).toBe('9999');
    });

    it('should add K when appropriate', () => {
      expect(shortenCountIntoString(10000)).toBe('10K');
      expect(shortenCountIntoString(109000)).toBe('109K');
      expect(shortenCountIntoString(109800)).toBe('109.8K');
      expect(shortenCountIntoString(109897)).toBe('109.8K');
    });

    it('should add M when appropriate', () => {
      expect(shortenCountIntoString(10000000)).toBe('10M');
      expect(shortenCountIntoString(109000000)).toBe('109M');
      expect(shortenCountIntoString(109800000)).toBe('109.8M');
      expect(shortenCountIntoString(109890000)).toBe('109.8M');
    });

    it('should add B when appropriate', () => {
      expect(shortenCountIntoString(10000000000)).toBe('10B');
      expect(shortenCountIntoString(109000000000)).toBe('109B');
      expect(shortenCountIntoString(109800000000)).toBe('109.8B');
      expect(shortenCountIntoString(109890000000)).toBe('109.8B');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSOError, isSODecoratedError } from './error';

describe('common utils', () => {
  describe('isSOError', () => {
    it('returns true if the SO is an error', () => {
      expect(isSOError({ error: { statusCode: '404' } })).toBe(true);
    });

    it('returns false if the SO is not an error', () => {
      expect(isSOError({})).toBe(false);
    });
  });

  describe('isSODecoratedError', () => {
    it('returns true if the SO error is a decorated error', () => {
      // @ts-expect-error: only the isBoom property is required
      expect(isSODecoratedError({ isBoom: true })).toBe(true);
    });

    it('returns false if the SO is not a decorated error', () => {
      // @ts-expect-error: only the isBoom property is required
      expect(isSODecoratedError({})).toBe(false);
    });
  });
});

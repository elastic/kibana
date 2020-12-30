/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidCertVal } from '../settings';

describe('settings', () => {
  describe('isValidCertVal', () => {
    it('handles NaN values', () => {
      expect(isValidCertVal(NaN)).toMatchInlineSnapshot(`"Must be a number."`);
    });

    it('handles undefined', () => {
      expect(isValidCertVal(undefined)).toMatchInlineSnapshot(`"Must be a number."`);
    });

    it('handles non-integer numbers', () => {
      expect(isValidCertVal(23.5)).toMatchInlineSnapshot(`"Value must be an integer."`);
    });

    it('handles values less than 0', () => {
      expect(isValidCertVal(-1)).toMatchInlineSnapshot(`"Value must be greater than 0."`);
    });

    it('handles 0', () => {
      expect(isValidCertVal(0)).toMatchInlineSnapshot(`"Value must be greater than 0."`);
    });

    it('allows valid integer numbers', () => {
      expect(isValidCertVal(67)).toBeUndefined();
    });
  });
});

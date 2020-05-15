/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isValidCertVal } from '../settings';

describe('settings', () => {
  describe('isValidCertVal', () => {
    it('identifies empty string', () => {
      expect(isValidCertVal('')).toMatchInlineSnapshot(`"May not be blank."`);
    });

    it('identifies values less than 0', () => {
      expect(isValidCertVal(-1)).toMatchInlineSnapshot(`"Value must be greater than 0."`);
    });

    it('identifies NaN values', () => {
      expect(isValidCertVal(' ')).toMatchInlineSnapshot(`"Value must be greater than 0."`);
    });

    it('identifies non-integer numbers', () => {
      expect(isValidCertVal('23.5')).toMatchInlineSnapshot(`"Value must be an integer."`);
    });

    it('allows valid integer strings', () => {
      expect(isValidCertVal('45')).toBeUndefined();
    });

    it('allows valid integer numbers', () => {
      expect(isValidCertVal(67)).toBeUndefined();
    });
  });
});

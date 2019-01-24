/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { arrify } from './utils';
describe('utils', () => {
  describe('arrify()', () => {
    it('should convert value to array', () => {
      const value = 'foo';
      expect(arrify(value)).toEqual([value]);
    });
    it('should not change a value that is already an array', () => {
      const value = ['foo'];
      expect(arrify(value)).toBe(value);
    });
  });
});

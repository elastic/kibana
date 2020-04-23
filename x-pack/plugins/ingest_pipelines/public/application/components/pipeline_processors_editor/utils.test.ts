/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getValue, setValue } from './utils';

describe('get and set values', () => {
  describe('#getValue', () => {
    it('gets a deeply nested value', () => {
      const test = Object.freeze([{ a: [{ a: 1 }] }]);
      expect(getValue(['0', 'a', '0', 'a'], test)).toBe(1);
    });

    it('empty array for path returns "root" value', () => {
      const test = Object.freeze([{ a: [{ a: 1 }] }]);
      const result = getValue([], test);
      expect(result).toEqual(test);
      // Getting does not create a copy
      expect(result).toBe(test);
    });
  });

  describe('#setValue', () => {
    it('sets a deeply nested value', () => {
      const test = Object.freeze([{ a: [{ a: 1 }] }]);
      setValue(['0', 'a', '0', 'a'], test, 2);
      expect(test).toEqual([{ a: [{ a: 2 }] }]);
    });

    it('returns value if no path was provided', () => {
      const test = Object.freeze([{ a: [{ a: 1 }] }]);
      setValue([], test, 2);
      expect(test).toEqual([{ a: [{ a: 1 }] }]);
    });
  });
});

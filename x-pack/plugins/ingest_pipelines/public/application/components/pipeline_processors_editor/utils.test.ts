/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getValue, setValue } from './utils';

describe('get and set values immutably with objects and arrays', () => {
  const test = Object.freeze([{ a: [{ a: 1 }] }]);
  describe('#getValue', () => {
    it('gets a deeply nested value', () => {
      expect(getValue(['0', 'a', '0', 'a'], test)).toBe(1);
    });
  });

  describe('#setValue', () => {
    it('sets a deeply nested value', () => {
      const result = setValue(['0', 'a', '0', 'a'], test, 2);
      expect(result).toEqual([{ a: [{ a: 2 }] }]);
      expect(result).not.toBe(test);
    });
  });
});

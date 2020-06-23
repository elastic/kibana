/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { objectToArray, arrayToObject } from './utils';

describe('utils', () => {
  describe('objectToArray()', () => {
    it('should convert object to an array', () => {
      const item1 = { name: 'foo' };
      const item2 = { name: 'bar' };
      const expected = [
        { ...item1, __id__: 'item1' },
        { ...item2, __id__: 'item2' },
      ];
      const output = objectToArray({ item1, item2 });

      expect(output).toEqual(expected);
    });
  });

  describe('arrayToObject()', () => {
    it('should convert an array to  array', () => {
      const item1 = { name: 'foo', customKey: 'key1' };
      const item2 = { name: 'bar', customKey: 'key2' };
      const expected = { key1: item1, key2: item2 };
      const output = arrayToObject([item1, item2], 'customKey');

      expect(output).toEqual(expected);
    });
  });
});

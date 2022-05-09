/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { allCases, allCasesSnake } from '../containers/mock';
import { convertAllCasesToCamel, convertArrayToCamelCase, convertToCamelCase } from './utils';

describe('utils', () => {
  describe('convertArrayToCamelCase', () => {
    it('converts an array of items to camel case correctly', () => {
      const items = [
        { foo_bar: [{ bar_foo: '1' }], test_bar: '2', obj_pros: { is_valid: true } },
        { bar_test: [{ baz_foo: '1' }], test_bar: '2', obj_pros: { is_valid: true } },
      ];
      expect(convertArrayToCamelCase(items)).toEqual([
        { fooBar: [{ barFoo: '1' }], testBar: '2', objPros: { isValid: true } },
        { barTest: [{ bazFoo: '1' }], testBar: '2', objPros: { isValid: true } },
      ]);
    });
  });

  describe('convertToCamelCase', () => {
    it('converts an object to camel case correctly', () => {
      const obj = { bar_test: [{ baz_foo: '1' }], test_bar: '2', obj_pros: { is_valid: true } };

      expect(convertToCamelCase(obj)).toEqual({
        barTest: [{ bazFoo: '1' }],
        testBar: '2',
        objPros: { isValid: true },
      });
    });
  });

  describe('convertAllCasesToCamel', () => {
    it('converts the find response to camel case', () => {
      expect(convertAllCasesToCamel(allCasesSnake)).toEqual(allCases);
    });
  });
});

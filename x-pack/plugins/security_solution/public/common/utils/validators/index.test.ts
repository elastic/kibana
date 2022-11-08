/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUrlInvalid, hasValueToDisplay } from '.';

describe('helpers', () => {
  describe('isUrlInvalid', () => {
    test('should verify invalid url', () => {
      expect(isUrlInvalid('this is not a url')).toBeTruthy();
    });

    test('should verify as invalid url without http(s):// prefix', () => {
      expect(isUrlInvalid('www.thisIsNotValid.com/foo')).toBeTruthy();
    });

    test('verifies valid url', () => {
      expect(isUrlInvalid('https://www.elastic.co/foo')).toBeFalsy();
    });

    test('should verify valid wwww such as 4 of them.', () => {
      expect(isUrlInvalid('https://wwww.example.com/foo')).toBeFalsy();
    });

    test('should validate characters such as %22 being part of a correct URL.', () => {
      expect(isUrlInvalid('https://www.exam%22ple.com/foo')).toBeFalsy();
    });

    test('should validate characters incorrectly such as ]', () => {
      expect(isUrlInvalid('https://www.example.com[')).toBeTruthy();
    });

    test('should verify valid http url', () => {
      expect(isUrlInvalid('http://www.example.com/foo')).toBeFalsy();
    });

    test('should verify as valid when given an empty string', () => {
      expect(isUrlInvalid('')).toBeFalsy();
    });

    test('empty spaces should valid as not valid ', () => {
      expect(isUrlInvalid(' ')).toBeTruthy();
    });

    test('should verify as invalid url without //', () => {
      expect(isUrlInvalid('http:www.thisIsNotValid.com/foo')).toBeTruthy();
    });
  });

  describe('hasValueToDisplay', () => {
    test('identifies valid values', () => {
      expect(hasValueToDisplay('test')).toBeTruthy();
      expect(hasValueToDisplay(0)).toBeTruthy();
      expect(hasValueToDisplay(100)).toBeTruthy();
    });

    test('identifies empty/invalid values', () => {
      expect(hasValueToDisplay('')).toBeFalsy();
      expect(hasValueToDisplay(null)).toBeFalsy();
      expect(hasValueToDisplay(undefined)).toBeFalsy();
    });
  });
});

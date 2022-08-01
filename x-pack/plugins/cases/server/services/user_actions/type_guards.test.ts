/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObjectArray, isStringArray } from './type_guards';

describe('type_guards', () => {
  describe('isStringArray', () => {
    it('returns true when the value is an empty array', () => {
      expect(isStringArray([])).toBeTruthy();
    });

    it('returns true when the value is an array of a single string', () => {
      expect(isStringArray(['a'])).toBeTruthy();
    });

    it('returns true when the value is an array of multiple strings', () => {
      expect(isStringArray(['a', 'b'])).toBeTruthy();
    });

    it('returns false when the value is an array of strings and numbers', () => {
      expect(isStringArray(['a', 1])).toBeFalsy();
    });

    it('returns false when the value is an array of strings and objects', () => {
      expect(isStringArray(['a', {}])).toBeFalsy();
    });
  });

  describe('isObjectArray', () => {
    it('returns true when the value is an empty array', () => {
      expect(isObjectArray([])).toBeTruthy();
    });

    it('returns true when the value is an array of a single string', () => {
      expect(isObjectArray([{ a: '1' }])).toBeTruthy();
    });

    it('returns true when the value is an array of multiple strings', () => {
      expect(isObjectArray([{ a: 'a' }, { b: 'b' }])).toBeTruthy();
    });

    it('returns false when the value is an array of strings and numbers', () => {
      expect(isObjectArray([{ a: 'a' }, 1])).toBeFalsy();
    });

    it('returns false when the value is an array of strings and objects', () => {
      expect(isObjectArray(['a', {}])).toBeFalsy();
    });
  });
});

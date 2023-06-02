/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIgnored } from './is_ignored';

describe('is_ignored', () => {
  beforeAll(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('string matching', () => {
    test('it returns false if given an empty array', () => {
      expect(isIgnored('simple.value', [])).toEqual(false);
    });

    test('it returns true if a simple string value matches', () => {
      expect(isIgnored('simple.value', ['simple.value'])).toEqual(true);
    });

    test('it returns false if a simple string value does not match', () => {
      expect(isIgnored('simple', ['simple.value'])).toEqual(false);
    });

    test('it returns true if a simple string value matches with two strings', () => {
      expect(isIgnored('simple.value', ['simple.value', 'simple.second.value'])).toEqual(true);
    });

    test('it returns true if a simple string value matches the second string', () => {
      expect(isIgnored('simple.second.value', ['simple.value', 'simple.second.value'])).toEqual(
        true
      );
    });

    test('it returns false if a simple string value does not match two strings', () => {
      expect(isIgnored('simple', ['simple.value', 'simple.second.value'])).toEqual(false);
    });

    test('it returns true if mixed with a regular expression in the list', () => {
      expect(isIgnored('simple', ['simple', '/[_]+/'])).toEqual(true);
    });
  });

  describe('regular expression matching', () => {
    test('it returns true if a simple regular expression matches', () => {
      expect(isIgnored('_ignored', ['/[_]+/'])).toEqual(true);
    });

    test('it returns false if a simple regular expression does not match', () => {
      expect(isIgnored('simple', ['/[_]+/'])).toEqual(false);
    });

    test('it returns true if a simple regular expression matches a longer string', () => {
      expect(isIgnored('___ignored', ['/[_]+/'])).toEqual(true);
    });

    test('it returns true if mixed with regular stings', () => {
      expect(isIgnored('___ignored', ['simple', '/[_]+/'])).toEqual(true);
    });

    test('it returns true with start anchor', () => {
      expect(isIgnored('_ignored', ['simple', '/^[_]+/'])).toEqual(true);
    });

    test('it returns false with start anchor', () => {
      expect(isIgnored('simple.something_', ['simple', '/^[_]+/'])).toEqual(false);
    });

    test('it returns true with end anchor', () => {
      expect(isIgnored('something_', ['simple', '/[_]+$/'])).toEqual(true);
    });

    test('it returns false with end anchor', () => {
      expect(isIgnored('_something', ['simple', '/[_]+$/'])).toEqual(false);
    });
  });
});

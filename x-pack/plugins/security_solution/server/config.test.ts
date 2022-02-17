/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('config', () => {
  describe('alertIgnoreFields', () => {
    test('should default to an empty array', () => {
      expect(configSchema.validate({}).alertIgnoreFields).toEqual([]);
    });

    test('should accept an array of strings', () => {
      expect(
        configSchema.validate({ alertIgnoreFields: ['foo.bar', 'mars.bar'] }).alertIgnoreFields
      ).toEqual(['foo.bar', 'mars.bar']);
    });

    test('should throw if a non string is being sent in', () => {
      expect(
        () =>
          configSchema.validate({
            alertIgnoreFields: 5,
          }).alertIgnoreFields
      ).toThrow('[alertIgnoreFields]: expected value of type [array] but got [number]');
    });

    test('should throw if we send in an invalid regular expression as a string', () => {
      expect(
        () =>
          configSchema.validate({
            alertIgnoreFields: ['/(/'],
          }).alertIgnoreFields
      ).toThrow(
        '[alertIgnoreFields]: "Invalid regular expression: /(/: Unterminated group" at array position 0'
      );
    });

    test('should throw with two errors if we send two invalid regular expressions', () => {
      expect(
        () =>
          configSchema.validate({
            alertIgnoreFields: ['/(/', '/(invalid/'],
          }).alertIgnoreFields
      ).toThrow(
        '[alertIgnoreFields]: "Invalid regular expression: /(/: Unterminated group" at array position 0. "Invalid regular expression: /(invalid/: Unterminated group" at array position 1'
      );
    });

    test('should throw with two errors with a valid string mixed in if we send two invalid regular expressions', () => {
      expect(
        () =>
          configSchema.validate({
            alertIgnoreFields: ['/(/', 'valid.string', '/(invalid/'],
          }).alertIgnoreFields
      ).toThrow(
        '[alertIgnoreFields]: "Invalid regular expression: /(/: Unterminated group" at array position 0. "Invalid regular expression: /(invalid/: Unterminated group" at array position 2'
      );
    });

    test('should accept a valid regular expression within the string', () => {
      expect(
        configSchema.validate({
          alertIgnoreFields: ['/(.*)/'],
        }).alertIgnoreFields
      ).toEqual(['/(.*)/']);
    });

    test('should accept two valid regular expressions', () => {
      expect(
        configSchema.validate({
          alertIgnoreFields: ['/(.*)/', '/(.valid*)/'],
        }).alertIgnoreFields
      ).toEqual(['/(.*)/', '/(.valid*)/']);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  arrayToJsonFormatter,
  objectToJsonFormatter,
  stringToJsonFormatter,
  secondsToCronFormatter,
} from './formatters';

describe('formatters', () => {
  describe('cronToSecondsNormalizer', () => {
    it('takes a number of seconds and converts it to cron format', () => {
      expect(secondsToCronFormatter('3')).toEqual('3s');
    });
  });

  describe('arrayToJsonFormatter', () => {
    it('takes an array and converts it to json', () => {
      expect(arrayToJsonFormatter(['tag1', 'tag2'])).toEqual('["tag1","tag2"]');
    });

    it('returns null if the array has length of 0', () => {
      expect(arrayToJsonFormatter([])).toEqual(null);
    });
  });

  describe('objectToJsonFormatter', () => {
    it('takes a json object string and returns an object', () => {
      expect(objectToJsonFormatter({ key: 'value' })).toEqual('{"key":"value"}');
    });

    it('returns null if the object has no keys', () => {
      expect(objectToJsonFormatter({})).toEqual(null);
    });
  });

  describe('stringToJsonFormatter', () => {
    it('takes a string and returns an json string', () => {
      expect(stringToJsonFormatter('step("test step", () => {})')).toEqual(
        '"step(\\"test step\\", () => {})"'
      );
    });

    it('returns null if the string is falsy', () => {
      expect(stringToJsonFormatter('')).toEqual(null);
    });
  });
});

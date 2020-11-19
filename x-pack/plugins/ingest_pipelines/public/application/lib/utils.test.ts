/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { stringifyJson, parseJson } from './utils';

describe('utils', () => {
  describe('stringifyJson()', () => {
    it('should stringify a valid JSON array', () => {
      expect(stringifyJson([1, 2, 3])).toEqual(`[
  1,
  2,
  3
]`);
    });

    it('should return a stringified empty array if the value is not a valid JSON array', () => {
      expect(stringifyJson({})).toEqual('[\n\n]');
    });
  });

  describe('parseJson()', () => {
    it('should parse a valid JSON string', () => {
      expect(parseJson('[1,2,3]')).toEqual([1, 2, 3]);
      expect(parseJson('[{"foo": "bar"}]')).toEqual([{ foo: 'bar' }]);
    });

    it('should convert valid JSON that is not an array to an array', () => {
      expect(parseJson('{"foo": "bar"}')).toEqual([{ foo: 'bar' }]);
    });

    it('should return an empty array if invalid JSON string', () => {
      expect(parseJson('{invalidJsonString}')).toEqual([]);
    });
  });
});

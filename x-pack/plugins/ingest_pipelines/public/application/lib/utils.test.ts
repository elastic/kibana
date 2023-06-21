/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyJson, parseJson } from './utils';

describe('utils', () => {
  describe('stringifyJson()', () => {
    describe('when rendering as an array', () => {
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

    describe('when rendering as an object', () => {
      it('should stringify a valid JSON object', () => {
        expect(stringifyJson({ field_1: 'hello', field_2: 5, field_3: true }, false)).toEqual(`{
  "field_1": "hello",
  "field_2": 5,
  "field_3": true
}`);
      });

      it('should return a stringified empty object if the value is not a valid JSON object', () => {
        expect(stringifyJson([1, 2, 3], false)).toEqual('{\n\n}');
        expect(stringifyJson('test', false)).toEqual('{\n\n}');
        expect(stringifyJson(10, false)).toEqual('{\n\n}');
      });
    });
  });

  describe('parseJson()', () => {
    describe('when rendering as an array', () => {
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

    describe('when rendering as an object', () => {
      it('should parse a valid JSON string', () => {
        expect(parseJson('{"foo": "bar"}', false)).toEqual({ foo: 'bar' });
        expect(parseJson('{}', false)).toEqual({});
      });

      it('should return an empty object if invalid JSON string', () => {
        expect(parseJson('{invalidJsonString}', false)).toEqual({});
        expect(parseJson('[invalidJsonString]', false)).toEqual({});
      });
    });
  });
});

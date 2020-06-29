/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { Type, operator_type as operatorType, type } from './schemas';

describe('Common schemas', () => {
  describe('operatorType', () => {
    test('it should validate for "match"', () => {
      const payload = 'match';
      const decoded = operatorType.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate for "match_any"', () => {
      const payload = 'match_any';
      const decoded = operatorType.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate for "list"', () => {
      const payload = 'list';
      const decoded = operatorType.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate for "exists"', () => {
      const payload = 'exists';
      const decoded = operatorType.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should contain 4 keys', () => {
      // Might seem like a weird test, but its meant to
      // ensure that if operatorType is updated, you
      // also update the OperatorTypeEnum, a workaround
      // for io-ts not yet supporting enums
      // https://github.com/gcanti/io-ts/issues/67
      const keys = Object.keys(operatorType.keys);

      expect(keys.length).toEqual(4);
    });
  });

  describe('type', () => {
    test('it will work with a given expected type', () => {
      const payload: Type = 'keyword';
      const decoded = type.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given a type that does not exist', () => {
      const payload: Type | 'madeup' = 'madeup';
      const decoded = type.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "madeup" supplied to ""binary" | "boolean" | "byte" | "date" | "date_nanos" | "date_range" | "double" | "double_range" | "float" | "float_range" | "geo_point" | "geo_shape" | "half_float" | "integer" | "integer_range" | "ip" | "ip_range" | "keyword" | "long" | "long_range" | "shape" | "short" | "text""',
      ]);
      expect(message.schema).toEqual({});
    });
  });
});

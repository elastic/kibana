/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import {
  ExceptionListTypeEnum,
  ListOperatorEnum as OperatorEnum,
  Type,
  exceptionListType,
  listOperator as operator,
  osType,
  osTypeArrayOrUndefined,
  type,
} from '@kbn/securitysolution-io-ts-list-types';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

describe('Common schemas', () => {
  describe('operator', () => {
    test('it should validate for "included"', () => {
      const payload = 'included';
      const decoded = operator.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate for "excluded"', () => {
      const payload = 'excluded';
      const decoded = operator.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should contain same amount of keys as enum', () => {
      // Might seem like a weird test, but its meant to
      // ensure that if operator is updated, you
      // also update the operatorEnum, a workaround
      // for io-ts not yet supporting enums
      // https://github.com/gcanti/io-ts/issues/67
      const keys = Object.keys(operator.keys).sort().join(',').toLowerCase();
      const enumKeys = Object.keys(OperatorEnum).sort().join(',').toLowerCase();

      expect(keys).toEqual(enumKeys);
    });
  });

  describe('exceptionListType', () => {
    test('it should validate for "detection"', () => {
      const payload = 'detection';
      const decoded = exceptionListType.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should validate for "endpoint"', () => {
      const payload = 'endpoint';
      const decoded = exceptionListType.decode(payload);
      const message = pipe(decoded, foldLeftRight);

      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it should contain same amount of keys as enum', () => {
      // Might seem like a weird test, but its meant to
      // ensure that if exceptionListType is updated, you
      // also update the ExceptionListTypeEnum, a workaround
      // for io-ts not yet supporting enums
      // https://github.com/gcanti/io-ts/issues/67
      const keys = Object.keys(exceptionListType.keys).sort().join(',').toLowerCase();
      const enumKeys = Object.keys(ExceptionListTypeEnum).sort().join(',').toLowerCase();

      expect(keys).toEqual(enumKeys);
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

  describe('osType', () => {
    test('it will validate a correct osType', () => {
      const payload = 'windows';
      const decoded = osType.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will fail to validate an incorrect osType', () => {
      const payload = 'foo';
      const decoded = osType.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([
        'Invalid value "foo" supplied to ""linux" | "macos" | "windows""',
      ]);
      expect(message.schema).toEqual({});
    });

    test('it will default to an empty array when osTypeArrayOrUndefined is used', () => {
      const payload = undefined;
      const decoded = osTypeArrayOrUndefined.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual([]);
    });
  });
});

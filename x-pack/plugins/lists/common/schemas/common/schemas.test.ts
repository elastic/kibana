/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { foldLeftRight, getPaths } from '../../siem_common_deps';

import { exceptionListType, operator, operator_type as operatorType } from './schemas';

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

    test('it should contain 2 keys', () => {
      // Might seem like a weird test, but its meant to
      // ensure that if operator is updated, you
      // also update the operatorEnum, a workaround
      // for io-ts not yet supporting enums
      // https://github.com/gcanti/io-ts/issues/67
      const keys = Object.keys(operator.keys);

      expect(keys.length).toEqual(2);
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

    test('it should contain 2 keys', () => {
      // Might seem like a weird test, but its meant to
      // ensure that if exceptionListType is updated, you
      // also update the ExceptionListTypeEnum, a workaround
      // for io-ts not yet supporting enums
      // https://github.com/gcanti/io-ts/issues/67
      const keys = Object.keys(exceptionListType.keys);

      expect(keys.length).toEqual(2);
    });
  });
});

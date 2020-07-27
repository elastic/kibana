/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import {
  EsDataTypeGeoPoint,
  EsDataTypeGeoPointRange,
  EsDataTypeRange,
  EsDataTypeRangeTerm,
  EsDataTypeSingle,
  EsDataTypeUnion,
  Type,
  esDataTypeGeoPoint,
  esDataTypeGeoPointRange,
  esDataTypeRange,
  esDataTypeRangeTerm,
  esDataTypeSingle,
  esDataTypeUnion,
  exceptionListType,
  operator,
  operator_type as operatorType,
  type,
} from './schemas';

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

  describe('esDataTypeRange', () => {
    test('it will work with a given gte, lte range', () => {
      const payload: EsDataTypeRange = { gte: '127.0.0.1', lte: '127.0.0.1' };
      const decoded = esDataTypeRange.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value', () => {
      const payload: EsDataTypeRange & { madeupvalue: string } = {
        gte: '127.0.0.1',
        lte: '127.0.0.1',
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRange.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('esDataTypeRangeTerm', () => {
    test('it will work with a date_range', () => {
      const payload: EsDataTypeRangeTerm = { date_range: { gte: '2015', lte: '2017' } };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value for date_range', () => {
      const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
        date_range: { gte: '2015', lte: '2017' },
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });

    test('it will work with a double_range', () => {
      const payload: EsDataTypeRangeTerm = { double_range: { gte: '2015', lte: '2017' } };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value for double_range', () => {
      const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
        double_range: { gte: '2015', lte: '2017' },
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });

    test('it will work with a float_range', () => {
      const payload: EsDataTypeRangeTerm = { float_range: { gte: '2015', lte: '2017' } };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value for float_range', () => {
      const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
        float_range: { gte: '2015', lte: '2017' },
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });

    test('it will work with a integer_range', () => {
      const payload: EsDataTypeRangeTerm = { integer_range: { gte: '2015', lte: '2017' } };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value for integer_range', () => {
      const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
        integer_range: { gte: '2015', lte: '2017' },
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });

    test('it will work with a ip_range', () => {
      const payload: EsDataTypeRangeTerm = { ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' } };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will work with a ip_range as a CIDR', () => {
      const payload: EsDataTypeRangeTerm = { ip_range: '127.0.0.1/16' };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value for ip_range', () => {
      const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
        ip_range: { gte: '127.0.0.1', lte: '127.0.0.2' },
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });

    test('it will work with a long_range', () => {
      const payload: EsDataTypeRangeTerm = { long_range: { gte: '2015', lte: '2017' } };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value for long_range', () => {
      const payload: EsDataTypeRangeTerm & { madeupvalue: string } = {
        long_range: { gte: '2015', lte: '2017' },
        madeupvalue: 'something',
      };
      const decoded = esDataTypeRangeTerm.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('esDataTypeGeoPointRange', () => {
    test('it will work with a given lat, lon range', () => {
      const payload: EsDataTypeGeoPointRange = { lat: '20', lon: '30' };
      const decoded = esDataTypeGeoPointRange.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value', () => {
      const payload: EsDataTypeGeoPointRange & { madeupvalue: string } = {
        lat: '20',
        lon: '30',
        madeupvalue: 'something',
      };
      const decoded = esDataTypeGeoPointRange.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('esDataTypeGeoPoint', () => {
    test('it will work with a given lat, lon range', () => {
      const payload: EsDataTypeGeoPoint = { geo_point: { lat: '127.0.0.1', lon: '127.0.0.1' } };
      const decoded = esDataTypeGeoPoint.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will work with a WKT (Well known text)', () => {
      const payload: EsDataTypeGeoPoint = { geo_point: 'POINT (30 10)' };
      const decoded = esDataTypeGeoPoint.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will give an error if given an extra madeup value', () => {
      const payload: EsDataTypeGeoPoint & { madeupvalue: string } = {
        geo_point: 'POINT (30 10)',
        madeupvalue: 'something',
      };
      const decoded = esDataTypeGeoPoint.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupvalue"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('esDataTypeSingle', () => {
    test('it will work with single type', () => {
      const payload: EsDataTypeSingle = { boolean: 'true' };
      const decoded = esDataTypeSingle.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will not work with a madeup value', () => {
      const payload: EsDataTypeSingle & { madeupValue: 'madeup' } = {
        boolean: 'true',
        madeupValue: 'madeup',
      };
      const decoded = esDataTypeSingle.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupValue"']);
      expect(message.schema).toEqual({});
    });
  });

  describe('esDataTypeUnion', () => {
    test('it will work with a regular union', () => {
      const payload: EsDataTypeUnion = { boolean: 'true' };
      const decoded = esDataTypeUnion.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual([]);
      expect(message.schema).toEqual(payload);
    });

    test('it will not work with a madeup value', () => {
      const payload: EsDataTypeUnion & { madeupValue: 'madeupValue' } = {
        boolean: 'true',
        madeupValue: 'madeupValue',
      };
      const decoded = esDataTypeUnion.decode(payload);
      const checked = exactCheck(payload, decoded);
      const message = pipe(checked, foldLeftRight);
      expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeupValue"']);
      expect(message.schema).toEqual({});
    });
  });
});

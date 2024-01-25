/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oracleRecordError, oracleRecord } from './index.mock';
import { convertValueToString, isRecordError, partitionRecordsByError } from './utils';

describe('utils', () => {
  describe('isRecordError', () => {
    it('returns true if the record contains an error', () => {
      expect(isRecordError(oracleRecordError)).toBe(true);
    });

    it('returns false if the record is an oracle record', () => {
      expect(isRecordError(oracleRecord)).toBe(false);
    });

    it('returns false if the record is an empty object', () => {
      // @ts-expect-error: need to test for empty objects
      expect(isRecordError({})).toBe(false);
    });
  });

  describe('partitionRecordsByError', () => {
    it('partition records correctly', () => {
      expect(
        partitionRecordsByError([oracleRecordError, oracleRecord, oracleRecordError, oracleRecord])
      ).toEqual([
        [oracleRecord, oracleRecord],
        [oracleRecordError, oracleRecordError],
      ]);
    });
  });

  describe('convertValueToString', () => {
    it('converts null correctly', () => {
      expect(convertValueToString(null)).toBe('');
    });

    it('converts undefined correctly', () => {
      expect(convertValueToString(undefined)).toBe('');
    });

    it('converts an array correctly', () => {
      expect(convertValueToString([1, 2, 'foo', { foo: 'bar' }])).toBe('[1,2,"foo",{"foo":"bar"}]');
    });

    it('converts an object correctly', () => {
      expect(convertValueToString({ foo: 'bar', baz: 2, qux: [1, 2, 'foo'] })).toBe(
        '{"foo":"bar","baz":2,"qux":[1,2,"foo"]}'
      );
    });

    it('converts a number correctly', () => {
      expect(convertValueToString(5.2)).toBe('5.2');
    });

    it('converts a string correctly', () => {
      expect(convertValueToString('foo')).toBe('foo');
    });

    it('converts a boolean correctly', () => {
      expect(convertValueToString(true)).toBe('true');
    });
  });
});

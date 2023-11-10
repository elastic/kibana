/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDateString, validateHistoryWindowStart, transformBucketsToValues } from './utils';

describe('new terms utils', () => {
  describe('parseDateString', () => {
    test('should correctly parse a static date', () => {
      const date = '2022-08-04T16:31:18.000Z';
      // forceNow shouldn't matter when we give a static date
      const forceNow = new Date();
      const parsedDate = parseDateString({ date, forceNow });
      expect(parsedDate.toISOString()).toEqual(date);
    });

    test('should correctly parse a relative date', () => {
      const date = 'now-5m';
      const forceNow = new Date('2022-08-04T16:31:18.000Z');
      const parsedDate = parseDateString({ date, forceNow });
      expect(parsedDate.toISOString()).toEqual('2022-08-04T16:26:18.000Z');
    });

    test(`should throw an error without a name if the string can't be parsed as a date`, () => {
      const date = 'notValid';
      const forceNow = new Date();
      expect(() => parseDateString({ date, forceNow })).toThrowError(
        `Failed to parse 'date string'`
      );
    });

    test(`should throw an error with a name if the string can't be parsed as a date`, () => {
      const date = 'notValid';
      const forceNow = new Date();
      expect(() => parseDateString({ date, forceNow, name: 'historyWindowStart' })).toThrowError(
        `Failed to parse 'historyWindowStart'`
      );
    });
  });

  describe('validateHistoryWindowStart', () => {
    test('should not throw if historyWindowStart is earlier than from', () => {
      const historyWindowStart = 'now-7m';
      const from = 'now-6m';
      validateHistoryWindowStart({ historyWindowStart, from });
    });

    test('should throw if historyWindowStart is equal to from', () => {
      const historyWindowStart = 'now-7m';
      const from = 'now-7m';
      expect(() => validateHistoryWindowStart({ historyWindowStart, from })).toThrowError(
        `History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'`
      );
    });

    test('should throw if historyWindowStart is later than from', () => {
      const historyWindowStart = 'now-7m';
      const from = 'now-8m';
      expect(() => validateHistoryWindowStart({ historyWindowStart, from })).toThrowError(
        `History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'`
      );
    });
  });

  describe('transformBucketsToValues', () => {
    it('should return correct value for a single new terms field', () => {
      expect(
        transformBucketsToValues(
          ['source.host'],
          [
            {
              key: {
                'source.host': 'host-0',
              },
              doc_count: 1,
            },
            {
              key: {
                'source.host': 'host-1',
              },
              doc_count: 3,
            },
          ]
        )
      ).toEqual(['host-0', 'host-1']);
    });

    it('should filter null values for a single new terms field', () => {
      expect(
        transformBucketsToValues(
          ['source.host'],
          [
            {
              key: {
                'source.host': 'host-0',
              },
              doc_count: 1,
            },
            {
              key: {
                'source.host': null,
              },
              doc_count: 3,
            },
          ]
        )
      ).toEqual(['host-0']);
    });

    // TODO: write test for multiple fields?
  });
});

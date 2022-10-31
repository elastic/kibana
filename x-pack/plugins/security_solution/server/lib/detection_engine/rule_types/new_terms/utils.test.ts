/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseDateString,
  validateHistoryWindowStart,
  transformBucketsToValues,
  getAggregationField,
  prepareNewTermsFieldsValues,
  decodeMatchedValues,
  AGG_FIELD_NAME,
} from './utils';

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

    it('should return correct value for multiple new terms fields', () => {
      expect(
        transformBucketsToValues(
          ['source.host', 'source.ip'],
          [
            {
              key: {
                'source.host': 'host-0',
                'source.ip': '127.0.0.1',
              },
              doc_count: 1,
            },
            {
              key: {
                'source.host': 'host-1',
                'source.ip': '127.0.0.1',
              },
              doc_count: 1,
            },
          ]
        )
      ).toEqual(['aG9zdC0w_MTI3LjAuMC4x', 'aG9zdC0x_MTI3LjAuMC4x']);
    });
  });

  describe('getAggregationField', () => {
    it('should return correct value for a single new terms field', () => {
      expect(getAggregationField(['source.ip'])).toBe('source.ip');
    });
    it('should return correct value for multiple new terms fields', () => {
      expect(getAggregationField(['source.host', 'source.ip'])).toBe(AGG_FIELD_NAME);
    });
  });

  describe('decodeMatchedValues', () => {
    it('should return correct value for a single new terms field', () => {
      expect(decodeMatchedValues(['source.ip'], '127.0.0.1')).toEqual(['127.0.0.1']);
    });
    it('should return correct value for multiple new terms fields', () => {
      expect(decodeMatchedValues(['source.host', 'source.ip'], 'aG9zdC0w_MTI3LjAuMC4x')).toEqual([
        'host-0',
        '127.0.0.1',
      ]);
    });
  });

  describe('prepareNewTermsFieldsValues', () => {
    it('should return correct value for a single new terms field', () => {
      expect(prepareNewTermsFieldsValues(['source.ip'], ['127.0.0.1'])).toEqual([
        'source.ip: 127.0.0.1',
      ]);
    });
    it('should return correct value for multiple new terms fields', () => {
      expect(
        prepareNewTermsFieldsValues(['source.host', 'source.ip'], ['host-0', '127.0.0.1'])
      ).toEqual(['source.host: host-0', 'source.ip: 127.0.0.1']);
    });
  });
});

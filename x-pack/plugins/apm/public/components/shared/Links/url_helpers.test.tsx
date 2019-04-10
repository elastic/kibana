/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { toJson } from '../testHelpers';
import { fromQuery, toQuery } from './url_helpers';

describe('toQuery', () => {
  it('should parse string to object', () => {
    expect(toQuery('?foo=bar&name=john%20doe')).toEqual({
      foo: 'bar',
      name: 'john doe'
    });
  });
});

describe('fromQuery', () => {
  it('should parse object to string', () => {
    expect(
      fromQuery({
        traceId: 'bar',
        transactionId: 'john doe'
      })
    ).toEqual('traceId=bar&transactionId=john%20doe');
  });

  it('should encode range params', () => {
    expect(
      fromQuery({
        traceId: 'b/c',
        rangeFrom: '2019-03-03T12:00:00.000Z',
        rangeTo: '2019-03-05T12:00:00.000Z'
      })
    ).toEqual(
      'traceId=b%2Fc&rangeFrom=2019-03-03T12%3A00%3A00.000Z&rangeTo=2019-03-05T12%3A00%3A00.000Z'
    );
  });

  it('should handle undefined, boolean, and number values without throwing errors', () => {
    expect(
      fromQuery({
        flyoutDetailTab: undefined,
        refreshPaused: true,
        refreshInterval: 5000
      })
    ).toEqual('flyoutDetailTab=&refreshPaused=true&refreshInterval=5000');
  });
});

describe('legacyEncodeURIComponent', () => {
  it('should encode a string with forward slashes', () => {
    expect(encodeURIComponent('a/b/c')).toBe('a%2Fb%2Fc');
  });

  it('should encode a string with spaces', () => {
    expect(encodeURIComponent('a b c')).toBe('a%20b%20c');
  });
});

describe('legacyDecodeURIComponent', () => {
  ['a/b/c', 'a~b~c', 'GET /', 'foo ~ bar /'].map(input => {
    it(`should encode and decode ${input}`, () => {
      const converted = decodeURIComponent(encodeURIComponent(input));
      expect(converted).toBe(input);
    });
  });

  describe('when Angular decodes forward slashes in a url', () => {
    it('should decode value correctly', () => {
      const transactionName = 'GET a/b/c/';
      const encodedTransactionName = encodeURIComponent(transactionName);
      const parsedUrl = decodeURIComponent(
        `/transaction/${encodedTransactionName}`
      );
      const decodedTransactionName = decodeURIComponent(
        parsedUrl.split('/')[2]
      );

      expect(decodedTransactionName).not.toBe(transactionName);
    });
  });
});

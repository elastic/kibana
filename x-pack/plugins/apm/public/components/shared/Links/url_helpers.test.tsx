/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { toJson } from '../testHelpers';
import {
  fromQuery,
  legacyDecodeURIComponent,
  legacyEncodeURIComponent,
  toQuery
} from './url_helpers';

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

  it('should not encode range params', () => {
    expect(
      fromQuery({
        rangeFrom: '2019-03-03T12:00:00.000Z',
        rangeTo: '2019-03-05T12:00:00.000Z'
      })
    ).toEqual(
      'rangeFrom=2019-03-03T12:00:00.000Z&rangeTo=2019-03-05T12:00:00.000Z'
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

describe('fromQuery and toQuery', () => {
  it('should encode and decode correctly', () => {
    expect(
      fromQuery(
        toQuery(
          '?name=john%20doe&rangeFrom=2019-03-03T12:00:00.000Z&path=a%2Fb'
        )
      )
    ).toEqual('name=john%20doe&rangeFrom=2019-03-03T12:00:00.000Z&path=a%2Fb');
  });
});

describe('legacyEncodeURIComponent', () => {
  it('should encode a string with forward slashes', () => {
    expect(legacyEncodeURIComponent('a/b/c')).toBe('a~2Fb~2Fc');
  });

  it('should encode a string with tilde', () => {
    expect(legacyEncodeURIComponent('a~b~c')).toBe('a~7Eb~7Ec');
  });

  it('should encode a string with spaces', () => {
    expect(legacyEncodeURIComponent('a b c')).toBe('a~20b~20c');
  });
});

describe('legacyDecodeURIComponent', () => {
  ['a/b/c', 'a~b~c', 'GET /', 'foo ~ bar /'].map(input => {
    it(`should encode and decode ${input}`, () => {
      const converted = legacyDecodeURIComponent(
        legacyEncodeURIComponent(input)
      );
      expect(converted).toBe(input);
    });
  });

  describe('when Angular decodes forward slashes in a url', () => {
    it('should decode value correctly', () => {
      const transactionName = 'GET a/b/c/';
      const encodedTransactionName = legacyEncodeURIComponent(transactionName);
      const parsedUrl = emulateAngular(
        `/transaction/${encodedTransactionName}`
      );
      const decodedTransactionName = legacyDecodeURIComponent(
        parsedUrl.split('/')[2]
      );

      expect(decodedTransactionName).toBe(transactionName);
    });

    it('should decode value incorrectly when using vanilla encodeURIComponent', () => {
      const transactionName = 'GET a/b/c/';
      const encodedTransactionName = encodeURIComponent(transactionName);
      const parsedUrl = emulateAngular(
        `/transaction/${encodedTransactionName}`
      );
      const decodedTransactionName = decodeURIComponent(
        parsedUrl.split('/')[2]
      );

      expect(decodedTransactionName).not.toBe(transactionName);
    });
  });
});

// Angular decodes forward slashes in path params
function emulateAngular(input: string) {
  return input
    .split('/')
    .map(pathParam => pathParam.replace(/%2F/g, '/'))
    .join('/');
}

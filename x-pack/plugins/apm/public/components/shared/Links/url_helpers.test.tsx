/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromQuery, toQuery } from './url_helpers';

describe('toQuery', () => {
  it('should parse string to object', () => {
    expect(toQuery('?foo=bar&name=john%20doe')).toEqual({
      foo: 'bar',
      name: 'john doe',
    });
  });
});

describe('fromQuery', () => {
  it('should not encode the following characters', () => {
    expect(
      fromQuery({
        a: true,
        b: 5000,
        c: ':',
      })
    ).toEqual('a=true&b=5000&c=:');
  });

  it('should encode the following characters', () => {
    expect(
      fromQuery({
        a: '@',
        b: '.',
        c: ';',
        d: ' ',
      })
    ).toEqual('a=%40&b=.&c=%3B&d=%20');
  });

  it('should handle null and undefined', () => {
    expect(
      fromQuery({
        a: undefined,
        b: null,
      })
    ).toEqual('a=&b=');
  });

  it('should handle arrays', () => {
    expect(
      fromQuery({
        arr: ['a', 'b'],
      })
    ).toEqual('arr=a%2Cb');
  });

  it('should parse object to string', () => {
    expect(
      fromQuery({
        traceId: 'bar',
        transactionId: 'john doe',
      })
    ).toEqual('traceId=bar&transactionId=john%20doe');
  });

  it('should not encode range params', () => {
    expect(
      fromQuery({
        rangeFrom: '2019-03-03T12:00:00.000Z',
        rangeTo: '2019-03-05T12:00:00.000Z',
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
        refreshInterval: 5000,
      })
    ).toEqual('flyoutDetailTab=&refreshPaused=true&refreshInterval=5000');
  });
});

describe('fromQuery and toQuery', () => {
  it('should encode and decode correctly', () => {
    expect(
      fromQuery(
        toQuery(
          '?name=john%20doe&path=a%2Fb&rangeFrom=2019-03-03T12:00:00.000Z'
        )
      )
    ).toEqual('name=john%20doe&path=a%2Fb&rangeFrom=2019-03-03T12:00:00.000Z');
  });
});

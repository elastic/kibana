/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import url from 'url';
// @ts-ignore
import { toJson } from '../testHelpers';
import {
  fromQuery,
  getKibanaHref,
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
        foo: 'bar',
        name: 'john doe'
      } as any)
    ).toEqual('foo=bar&name=john%20doe');
  });

  it('should not encode _a and _g', () => {
    expect(
      fromQuery({
        g: 'john doe:',
        _g: 'john doe:',
        a: 'john doe:',
        _a: 'john doe:'
      } as any)
    ).toEqual('g=john%20doe%3A&_g=john%20doe:&a=john%20doe%3A&_a=john%20doe:');
  });
});

describe('getKibanaHref', () => {
  it('should return the correct href', () => {
    const href = getKibanaHref({
      location: { search: '' } as Location,
      pathname: '/app/kibana',
      hash: '/discover',
      query: {
        _a: {
          interval: 'auto',
          query: {
            language: 'lucene',
            query: `context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"`
          },
          sort: { '@timestamp': 'desc' }
        }
      }
    });

    const { _g, _a } = getUrlQuery(href);
    const { pathname } = url.parse(href);

    expect(pathname).toBe('/app/kibana');
    expect(_a).toBe(
      '(interval:auto,query:(language:lucene,query:\'context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"\'),sort:(\'@timestamp\':desc))'
    );
    expect(_g).toBe('(time:(from:now-24h,mode:quick,to:now))');
  });
});

function getUrlQuery(href?: string) {
  const hash = url.parse(href!).hash!.slice(1);
  return url.parse(hash, true).query;
}

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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import url from 'url';
// @ts-ignore
import { toJson } from '../testHelpers';
import { fromQuery, getKibanaHref, toQuery } from './url_helpers';

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

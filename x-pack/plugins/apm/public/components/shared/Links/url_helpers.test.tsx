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
  it('should build correct url', () => {
    const location = {} as Location;
    const pathname = '/app/kibana';
    const hash = '/discover';
    const href = getKibanaHref({ location, pathname, hash });
    expect(href).toBe(
      '/app/kibana#/discover?_g=(time:(from:now-24h,mode:quick,to:now))'
    );
  });

  it('should rison encode _a', () => {
    const location = {} as Location;
    const pathname = '/app/kibana';
    const hash = '/discover';
    const query = {
      _a: {
        interval: 'auto',
        query: {
          language: 'lucene',
          query: `context.service.name:"myServiceName" AND error.grouping_key:"myGroupId"`
        },
        sort: { '@timestamp': 'desc' }
      }
    };
    const href = getKibanaHref({ query, location, pathname, hash });
    const { _a } = getUrlQuery(href);
    expect(_a).toEqual(
      `(interval:auto,query:(language:lucene,query:'context.service.name:\"myServiceName\" AND error.grouping_key:\"myGroupId\"'),sort:('@timestamp':desc))`
    );
  });

  describe('_g', () => {
    it('should preserve _g from location', () => {
      const location = {
        search: '?_g=(time:(from:now-7d,mode:relative,to:now-1d))'
      } as Location;
      const pathname = '/app/kibana';
      const hash = '/discover';
      const href = getKibanaHref({ location, pathname, hash });
      const { _g } = getUrlQuery(href);
      expect(_g).toBe('(time:(from:now-7d,mode:relative,to:now-1d))');
    });

    it('should use default time range when _g is empty', () => {
      const location = {} as Location;
      const pathname = '/app/kibana';
      const hash = '/discover';
      const href = getKibanaHref({ location, pathname, hash });
      const { _g } = getUrlQuery(href);
      expect(_g).toBe('(time:(from:now-24h,mode:quick,to:now))');
    });

    it('should use default value when given invalid input', () => {
      const location = { search: '?_g=H@whatever' } as Location;
      const pathname = '/app/kibana';
      const hash = '/discover';
      const href = getKibanaHref({ location, pathname, hash });
      const { _g } = getUrlQuery(href);
      expect(_g).toBe('(time:(from:now-24h,mode:quick,to:now))');
    });

    it('should merge in _g query values', () => {
      const location = {
        search: '?_g=(time:(from:now-7d,mode:relative,to:now-1d))'
      } as Location;
      const pathname = '/app/kibana';
      const hash = '/discover';
      const query = { _g: { ml: { jobIds: [1337] } } };
      const href = getKibanaHref({ location, query, pathname, hash });
      const { _g } = getUrlQuery(href);
      expect(_g).toBe(
        '(ml:(jobIds:!(1337)),time:(from:now-7d,mode:relative,to:now-1d))'
      );
    });
  });

  describe('when location contains kuery', () => {
    const location = {
      search: '?kuery=transaction.duration.us~20~3E~201'
    } as Location;

    it('should preserve kql for apm links', () => {
      const pathname = '/app/apm';
      const href = getKibanaHref({ location, pathname });
      const { kuery } = getUrlQuery(href);
      expect(kuery).toEqual('transaction.duration.us~20~3E~201');
    });

    it('should preserve kql for links without path', () => {
      const href = getKibanaHref({ location });
      const { kuery } = getUrlQuery(href);
      expect(kuery).toEqual('transaction.duration.us~20~3E~201');
    });

    it('should not preserve kql for non-apm links', () => {
      const pathname = '/app/kibana';
      const href = getKibanaHref({ location, pathname });
      const { kuery } = getUrlQuery(href);
      expect(kuery).toEqual(undefined);
    });
  });
});

function getUrlQuery(href: string) {
  const hash = url.parse(href).hash!.slice(1);
  return url.parse(hash, true).query;
}

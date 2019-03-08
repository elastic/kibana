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
        traceId: 'bar',
        transactionId: 'john doe'
      })
    ).toEqual('traceId=bar&transactionId=john%20doe');
  });

  it('should not encode range params', () => {
    expect(
      fromQuery({
        traceId: 'b/c',
        rangeFrom: '2019-03-03T12:00:00.000Z',
        rangeTo: '2019-03-05T12:00:00.000Z'
      })
    ).toEqual(
      'traceId=b%2Fc&rangeFrom=2019-03-03T12:00:00.000Z&rangeTo=2019-03-05T12:00:00.000Z'
    );
  });
});

describe('getKibanaHref', () => {
  it('should build correct URL for APM paths, include existing date range params', () => {
    const location = { search: '?rangeFrom=now/w&rangeTo=now-24h' } as Location;
    const pathname = '/app/apm';
    const hash = '/services/x/transactions';
    const query = { transactionId: 'something' };
    const href = getKibanaHref({ location, pathname, hash, query });
    expect(href).toEqual(
      '/app/apm#/services/x/transactions?rangeFrom=now/w&rangeTo=now-24h&transactionId=something'
    );
  });

  it('should build correct url for non-APM paths, ignoring date range params', () => {
    const location = { search: '?rangeFrom=now/w&rangeTo=now-24h' } as Location;
    const pathname = '/app/kibana';
    const hash = '/outside';
    const query = { transactionId: 'something' };
    const href = getKibanaHref({ location, pathname, hash, query });
    expect(href).toEqual('/app/kibana#/outside?transactionId=something');
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

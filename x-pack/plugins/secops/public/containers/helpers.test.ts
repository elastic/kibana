/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESQuery } from '../../common/typed_json';

import { createFilter, decodeIpv6, encodeIpv6 } from './helpers';

describe('Helpers', () => {
  describe('#createFilter', () => {
    test('if it is a string it returns untouched', () => {
      const filter = createFilter('even invalid strings return the same');
      expect(filter).toBe('even invalid strings return the same');
    });

    test('if it is an ESQuery object it will be returned as a string', () => {
      const query: ESQuery = { term: { 'host.id': 'host-value' } };
      const filter = createFilter(query);
      expect(filter).toBe(JSON.stringify(query));
    });

    test('if it is undefined, then undefined is returned', () => {
      const filter = createFilter(undefined);
      expect(filter).toBe(undefined);
    });
  });

  describe('#encodeIpv6', () => {
    test('if it encodes the provided IPv6 by replacing : with -', () => {
      const encodedIp = encodeIpv6('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
      expect(encodedIp).toBe('2001-db8-ffff-ffff-ffff-ffff-ffff-ffff');
    });
  });

  describe('#decodeIpv6', () => {
    test('if it decodes the provided IPv6 by replacing - with :', () => {
      const decodedIp = decodeIpv6('2001-db8-ffff-ffff-ffff-ffff-ffff-ffff');
      expect(decodedIp).toBe('2001:db8:ffff:ffff:ffff:ffff:ffff:ffff');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decodeIpv6, encodeIpv6 } from '../helpers';

describe('Helpers', () => {
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

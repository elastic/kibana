/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { encodeIpv6 } from '../../../../lib/helpers';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../../pages/network/ip_details';

import { getBreadcrumbsForRoute, siemRootBreadcrumb } from '.';

describe('Navigation Breadcrumbs', () => {
  const hostName = 'siem-kibana';
  describe('#getBreadcrumbsforRoute', () => {
    const hostBreadcrumbs = [...siemRootBreadcrumb, ...getHostDetailsBreadcrumbs(hostName)];
    const ipv4 = '192.0.2.255';
    const ipv4Breadcrumbs = [...siemRootBreadcrumb, ...getIPDetailsBreadcrumbs(ipv4)];
    const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
    const ipv6Encoded = encodeIpv6(ipv6);
    const ipv6Breadcrumbs = [...siemRootBreadcrumb, ...getIPDetailsBreadcrumbs(ipv6Encoded)];

    test('should return Host Details breadcrumbs when supplied link-to pathname with hostName', () => {
      const pathname = `/link-to/hosts/${hostName}`;
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(hostBreadcrumbs);
    });

    test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
      const pathname = `/hosts/${hostName}`;
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(hostBreadcrumbs);
    });

    test('should return IP Details breadcrumbs when supplied link-to pathname with ipv4', () => {
      const pathname = `link-to/network/ip/${ipv4}`;
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(ipv4Breadcrumbs);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
      const pathname = `/network/ip/${ipv4}`;
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(ipv4Breadcrumbs);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
      const pathname = `/network/ip/${ipv6Encoded}`;
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(ipv6Breadcrumbs);
    });
  });
});

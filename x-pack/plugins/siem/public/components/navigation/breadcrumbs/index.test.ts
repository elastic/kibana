/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';

import { encodeIpv6 } from '../../../lib/helpers';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';
import { TIMELINES_PAGE_NAME } from '../../link_to/redirect_to_timelines';

import { getBreadcrumbsForRoute, rootBreadcrumbs, setBreadcrumbs } from '.';

jest.mock('ui/chrome', () => ({
  getBasePath: () => {
    return '<basepath>';
  },
  breadcrumbs: {
    set: jest.fn(),
  },
}));

describe('Navigation Breadcrumbs', () => {
  const hostName = 'siem-kibana';
  const hostBreadcrumbs = [...rootBreadcrumbs.overview, ...getHostDetailsBreadcrumbs(hostName)];
  const ipv4 = '192.0.2.255';
  const ipv4Breadcrumbs = [...rootBreadcrumbs.overview, ...getIPDetailsBreadcrumbs(ipv4)];
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);
  const ipv6Breadcrumbs = [...rootBreadcrumbs.overview, ...getIPDetailsBreadcrumbs(ipv6Encoded)];
  describe('getBreadcrumbsForRoute', () => {
    test('should return Host breadcrumbs when supplied link-to host pathname', () => {
      const pathname = '/link-to/hosts';
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(rootBreadcrumbs.hosts);
    });

    test('should return Host breadcrumbs when supplied host pathname', () => {
      const pathname = '/hosts';
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(rootBreadcrumbs.hosts);
    });

    test('should return Network breadcrumbs when supplied network pathname', () => {
      const pathname = '/network';
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(rootBreadcrumbs.network);
    });

    test('should return Timelines breadcrumbs when supplied link-to timelines pathname', () => {
      const pathname = `/link-to/${TIMELINES_PAGE_NAME}`;
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(rootBreadcrumbs.timelines);
    });

    test('should return Timelines breadcrumbs when supplied timelines pathname', () => {
      const pathname = '/timelines';
      const breadcrumbs = getBreadcrumbsForRoute(pathname);
      expect(breadcrumbs).toEqual(rootBreadcrumbs.timelines);
    });

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
  describe('setBreadcrumbs()', () => {
    test('should call chrome breadcrumb service with correct breadcrumbs', () => {
      const pathname = `/hosts/${hostName}`;
      setBreadcrumbs(pathname);
      expect(chrome.breadcrumbs.set).toBeCalledWith(hostBreadcrumbs);
    });
  });
});

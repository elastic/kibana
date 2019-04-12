/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

// @ts-ignore Prevent auto-format from deleting - needed for 'chrome/ui' imports in host_details/ip_details
jest.doMock('ui/chrome', () => ({
  getBasePath: () => '',
}));

import { encodeIpv6 } from '../../../lib/helpers';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';

import { getBreadcrumbsForRoute, HeaderBreadcrumbs } from './breadcrumb';

describe('Navigation Breadcrumbs', () => {
  const hostId = '1d63559c1a3f4c4e9d979c4b3d8b83ff';
  const hostName = 'siem-kibana';
  describe('#getBreadcrumbsforRoute', () => {
    const hostBreadcrumbs = getHostDetailsBreadcrumbs(hostName);
    const ipv4 = '192.0.2.255';
    const ipv4Breadcrumbs = getIPDetailsBreadcrumbs(ipv4);
    const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
    const ipv6Encoded = encodeIpv6(ipv6);
    const ipv6Breadcrumbs = getIPDetailsBreadcrumbs(ipv6Encoded);

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

  describe('HeaderBreadcrumbs', () => {
    test('should render valid Navigation and no Breadcrumbs', () => {
      const hostPathname = `/link-to/hosts`;
      const wrapper = mount(
        <MemoryRouter initialEntries={[hostPathname]}>
          <HeaderBreadcrumbs />
        </MemoryRouter>
      );
      wrapper.update();
      expect(wrapper.find('Navigation').length).toEqual(1);
      expect(wrapper.find('EuiBreadcrumbs').length).toEqual(0);
    });

    test('should render valid Navigation and Breadcrumbs', () => {
      const hostPathname = `/link-to/hosts/${hostId}`;
      const wrapper = mount(
        <MemoryRouter initialEntries={[hostPathname]}>
          <HeaderBreadcrumbs />
        </MemoryRouter>
      );
      wrapper.update();
      expect(wrapper.find('Navigation').length).toEqual(0);
      expect(wrapper.find('EuiBreadcrumbs').length).toEqual(1);
    });
  });
});

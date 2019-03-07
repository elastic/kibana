/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { encodeIpv6 } from '../../containers/helpers';

import { HostDetailsLink, IPDetailsLink } from '.';

describe('Custom Links', () => {
  const hostId = '133fd7715f1d47979ce817ba0df10c6e';
  const hostName = 'Host Name';
  const ipv4 = '192.0.2.255';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('HostDetailsLink', () => {
    test('should render valid link to Host Details with hostId as the display text', () => {
      const wrapper = mount(<HostDetailsLink hostId={hostId} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/hosts/${encodeURIComponent(hostId)}`
      );
      expect(wrapper.text()).toEqual(hostId);
    });

    test('should render valid link to Host Details with child text as the display text', () => {
      const wrapper = mount(<HostDetailsLink hostId={hostId}>{hostName}</HostDetailsLink>);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/hosts/${encodeURIComponent(hostId)}`
      );
      expect(wrapper.text()).toEqual(hostName);
    });
  });

  describe('IPDetailsLink', () => {
    test('should render valid link to IP Details with ipv4 as the display text', () => {
      const wrapper = mount(<IPDetailsLink ip={ipv4} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/network/ip/${encodeURIComponent(ipv4)}`
      );
      expect(wrapper.text()).toEqual(ipv4);
    });

    test('should render valid link to IP Details with child text as the display text', () => {
      const wrapper = mount(<IPDetailsLink ip={ipv4}>{hostName}</IPDetailsLink>);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/network/ip/${encodeURIComponent(ipv4)}`
      );
      expect(wrapper.text()).toEqual(hostName);
    });

    test('should render valid link to IP Details with ipv6 as the display text', () => {
      const wrapper = mount(<IPDetailsLink ip={ipv6} />);
      expect(wrapper.find('EuiLink').prop('href')).toEqual(
        `#/link-to/network/ip/${encodeURIComponent(ipv6Encoded)}`
      );
      expect(wrapper.text()).toEqual(ipv6);
    });
  });
});

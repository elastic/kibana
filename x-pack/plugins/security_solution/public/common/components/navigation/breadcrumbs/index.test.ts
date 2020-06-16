/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import '../../../mock/match_media';
import { encodeIpv6 } from '../../../lib/helpers';

import { getBreadcrumbsForRoute, setBreadcrumbs } from '.';
import { HostsTableType } from '../../../../hosts/store/model';
import { RouteSpyState, SiemRouteType } from '../../../utils/route/types';
import { TabNavigationProps } from '../tab_navigation/types';
import { NetworkRouteType } from '../../../../network/pages/navigation/types';

const setBreadcrumbsMock = jest.fn();
const chromeMock = {
  setBreadcrumbs: setBreadcrumbsMock,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const mockDefaultTab = (pageName: string): SiemRouteType | undefined => {
  switch (pageName) {
    case 'hosts':
      return HostsTableType.authentications;
    case 'network':
      return NetworkRouteType.flows;
    default:
      return undefined;
  }
};

const getMockObject = (
  pageName: string,
  pathName: string,
  detailName: string | undefined
): RouteSpyState & TabNavigationProps => ({
  detailName,
  navTabs: {
    hosts: {
      disabled: false,
      href: '/app/security/hosts',
      id: 'hosts',
      name: 'Hosts',
      urlKey: 'host',
    },
    network: {
      disabled: false,
      href: '/app/security/network',
      id: 'network',
      name: 'Network',
      urlKey: 'network',
    },
    overview: {
      disabled: false,
      href: '/app/security/overview',
      id: 'overview',
      name: 'Overview',
      urlKey: 'overview',
    },
    timelines: {
      disabled: false,
      href: '/app/security/timelines',
      id: 'timelines',
      name: 'Timelines',
      urlKey: 'timeline',
    },
  },
  pageName,
  pathName,
  search: '',
  tabName: mockDefaultTab(pageName) as HostsTableType,
  query: { query: '', language: 'kuery' },
  filters: [],
  timeline: {
    id: '',
    isOpen: false,
  },
  timerange: {
    global: {
      linkTo: ['timeline'],
      timerange: {
        from: 1558048243696,
        fromStr: 'now-24h',
        kind: 'relative',
        to: 1558134643697,
        toStr: 'now',
      },
    },
    timeline: {
      linkTo: ['global'],
      timerange: {
        from: 1558048243696,
        fromStr: 'now-24h',
        kind: 'relative',
        to: 1558134643697,
        toStr: 'now',
      },
    },
  },
});

describe('Navigation Breadcrumbs', () => {
  const hostName = 'siem-kibana';

  const ipv4 = '192.0.2.255';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('getBreadcrumbsForRoute', () => {
    test('should return Host breadcrumbs when supplied host pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('hosts', '/', undefined));
      expect(breadcrumbs).toEqual([
        {
          href: '/app/security/overview',
          text: 'Security',
        },
        {
          href:
            '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
          text: 'Hosts',
        },
        {
          href: '',
          text: 'Authentications',
        },
      ]);
    });

    test('should return Network breadcrumbs when supplied network pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('network', '/', undefined));
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Network',
          href:
            '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: 'Flows',
          href: '',
        },
      ]);
    });

    test('should return Timelines breadcrumbs when supplied timelines pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('timelines', '/', undefined));
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        { text: 'Timelines', href: '' },
      ]);
    });

    test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('hosts', '/', hostName));
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Hosts',
          href:
            '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: 'siem-kibana',
          href:
            '/siem-kibana?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        { text: 'Authentications', href: '' },
      ]);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('network', '/', ipv4));
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Network',
          href:
            '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: ipv4,
          href: `/ip/${ipv4}/source?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
      const breadcrumbs = getBreadcrumbsForRoute(getMockObject('network', '/', ipv6Encoded));
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Network',
          href:
            '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: ipv6,
          href: `/ip/${ipv6Encoded}/source?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });
  });

  describe('setBreadcrumbs()', () => {
    test('should call chrome breadcrumb service with correct breadcrumbs', () => {
      setBreadcrumbs(getMockObject('hosts', '/', hostName), chromeMock);
      expect(setBreadcrumbsMock).toBeCalledWith([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Hosts',
          href:
            '?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        {
          text: 'siem-kibana',
          href:
            '/siem-kibana?timerange=(global:(linkTo:!(timeline),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)),timeline:(linkTo:!(global),timerange:(from:1558048243696,fromStr:now-24h,kind:relative,to:1558134643697,toStr:now)))',
        },
        { text: 'Authentications', href: '' },
      ]);
    });
  });
});

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
    case: {
      disabled: false,
      href: '/app/security/cases',
      id: 'case',
      name: 'Cases',
      urlKey: 'case',
    },
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
    graphEventId: '',
  },
  timerange: {
    global: {
      linkTo: ['timeline'],
      timerange: {
        from: '2019-05-16T23:10:43.696Z',
        fromStr: 'now-24h',
        kind: 'relative',
        to: '2019-05-17T23:10:43.697Z',
        toStr: 'now',
      },
    },
    timeline: {
      linkTo: ['global'],
      timerange: {
        from: '2019-05-16T23:10:43.696Z',
        fromStr: 'now-24h',
        kind: 'relative',
        to: '2019-05-17T23:10:43.697Z',
        toStr: 'now',
      },
    },
  },
  sourcerer: {},
});

const getUrlForAppMock = (appId: string, options?: { path?: string; absolute?: boolean }) =>
  `${appId}${options?.path ?? ''}`;

describe('Navigation Breadcrumbs', () => {
  const hostName = 'siem-kibana';

  const ipv4 = '192.0.2.255';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('getBreadcrumbsForRoute', () => {
    test('should return Host breadcrumbs when supplied host pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('hosts', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        {
          href: '/app/security/overview',
          text: 'Security',
        },
        {
          href:
            "securitySolution:hosts?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
          text: 'Hosts',
        },
        {
          href: '',
          text: 'Authentications',
        },
      ]);
    });

    test('should return Network breadcrumbs when supplied network pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('network', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Network',
          href:
            "securitySolution:network?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: 'Flows',
          href: '',
        },
      ]);
    });

    test('should return Timelines breadcrumbs when supplied timelines pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('timelines', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Timelines',
          href:
            "securitySolution:timelines?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
      ]);
    });

    test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('hosts', '/', hostName),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Hosts',
          href:
            "securitySolution:hosts?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: 'siem-kibana',
          href:
            "securitySolution:hosts/siem-kibana?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        { text: 'Authentications', href: '' },
      ]);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('network', '/', ipv4),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Network',
          href:
            "securitySolution:network?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: ipv4,
          href: `securitySolution:network/ip/${ipv4}/source?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });

    test('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('network', '/', ipv6Encoded),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Network',
          href:
            "securitySolution:network?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: ipv6,
          href: `securitySolution:network/ip/${ipv6Encoded}/source?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });

    test('should return Alerts breadcrumbs when supplied detection pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('detections', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Detections',
          href:
            "securitySolution:detections?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
      ]);
    });
    test('should return Cases breadcrumbs when supplied case pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('case', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Cases',
          href:
            "securitySolution:case?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
      ]);
    });
    test('should return Case details breadcrumbs when supplied case details pathname', () => {
      const sampleCase = {
        id: 'my-case-id',
        name: 'Case name',
      };
      const breadcrumbs = getBreadcrumbsForRoute(
        {
          ...getMockObject('case', `/${sampleCase.id}`, sampleCase.id),
          state: { caseTitle: sampleCase.name },
        },
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Cases',
          href:
            "securitySolution:case?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: sampleCase.name,
          href: `securitySolution:case/${sampleCase.id}?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
      ]);
    });
    test('should return Admin breadcrumbs when supplied admin pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('administration', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Administration',
          href: 'securitySolution:administration',
        },
      ]);
    });
  });

  describe('setBreadcrumbs()', () => {
    test('should call chrome breadcrumb service with correct breadcrumbs', () => {
      setBreadcrumbs(getMockObject('hosts', '/', hostName), chromeMock, getUrlForAppMock);
      expect(setBreadcrumbsMock).toBeCalledWith([
        { text: 'Security', href: '/app/security/overview' },
        {
          text: 'Hosts',
          href:
            "securitySolution:hosts?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: 'siem-kibana',
          href:
            "securitySolution:hosts/siem-kibana?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        { text: 'Authentications', href: '' },
      ]);
    });
  });
});

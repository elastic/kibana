/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../mock/match_media';
import { encodeIpv6 } from '../../../lib/helpers';
import { getBreadcrumbsForRoute, setBreadcrumbs } from '.';
import { HostsTableType } from '../../../../hosts/store/model';
import { RouteSpyState, SiemRouteType } from '../../../utils/route/types';
import { TabNavigationProps } from '../tab_navigation/types';
import { NetworkRouteType } from '../../../../network/pages/navigation/types';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { AdministrationSubTab } from '../../../../management/types';

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
    case 'administration':
      return AdministrationSubTab.endpoints;
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
    alerts: {
      disabled: false,
      href: '/app/security/alerts',
      id: 'alerts',
      name: 'Alerts',
      urlKey: 'alerts',
    },
    exceptions: {
      disabled: false,
      href: '/app/security/exceptions',
      id: 'exceptions',
      name: 'Exceptions',
      urlKey: 'exceptions',
    },
    rules: {
      disabled: false,
      href: '/app/security/rules',
      id: 'rules',
      name: 'Rules',
      urlKey: 'rules',
    },
  },
  pageName,
  pathName,
  search: '',
  tabName: mockDefaultTab(pageName) as HostsTableType,
  query: { query: '', language: 'kuery' },
  filters: [],
  timeline: {
    activeTab: TimelineTabs.query,
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

// The string returned is different from what getUrlForApp returns, but does not matter for the purposes of this test.
const getUrlForAppMock = (
  appId: string,
  options?: { deepLinkId?: string; path?: string; absolute?: boolean }
) => `${appId}${options?.deepLinkId ? `/${options.deepLinkId}` : ''}${options?.path ?? ''}`;

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
          href: 'securitySolution/overview',
          text: 'Security',
        },
        {
          href:
            "securitySolution/hosts?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
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
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Network',
          href:
            "securitySolution/network?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
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
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Timelines',
          href:
            "securitySolution/timelines?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
      ]);
    });

    test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('hosts', '/', hostName),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Hosts',
          href:
            "securitySolution/hosts?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: 'siem-kibana',
          href:
            "securitySolution/hosts/siem-kibana?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
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
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Network',
          href:
            "securitySolution/network?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: ipv4,
          href: `securitySolution/network/ip/${ipv4}/source?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
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
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Network',
          href:
            "securitySolution/network?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: ipv6,
          href: `securitySolution/network/ip/${ipv6Encoded}/source?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
        { text: 'Flows', href: '' },
      ]);
    });

    test('should return Alerts breadcrumbs when supplied alerts pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('alerts', '/alerts', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Alerts',
          href: '',
        },
      ]);
    });

    test('should return Exceptions breadcrumbs when supplied exceptions pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('exceptions', '/exceptions', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Exceptions',
          href: '',
        },
      ]);
    });

    test('should return Rules breadcrumbs when supplied rules pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('rules', '/rules', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Rules',
          href:
            "securitySolution/rules?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
      ]);
    });

    test('should return Rules breadcrumbs when supplied rules Creation pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('rules', '/rules/create', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Rules',
          href:
            "securitySolution/rules?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: 'Create',
          href: '',
        },
      ]);
    });

    test('should return Rules breadcrumbs when supplied rules Details pathname', () => {
      const mockDetailName = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
      const mockRuleName = 'RULE_NAME';
      const breadcrumbs = getBreadcrumbsForRoute(
        {
          ...getMockObject('rules', `/rules/id/${mockDetailName}`, undefined),
          detailName: mockDetailName,
          state: {
            ruleName: mockRuleName,
          },
        },
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Rules',
          href:
            "securitySolution/rules?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: mockRuleName,
          href: `securitySolution/rules/id/${mockDetailName}?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
      ]);
    });

    test('should return Rules breadcrumbs when supplied rules Edit pathname', () => {
      const mockDetailName = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
      const mockRuleName = 'RULE_NAME';
      const breadcrumbs = getBreadcrumbsForRoute(
        {
          ...getMockObject('rules', `/rules/id/${mockDetailName}/edit`, undefined),
          detailName: mockDetailName,
          state: {
            ruleName: mockRuleName,
          },
        },
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Rules',
          href:
            "securitySolution/rules?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: 'RULE_NAME',
          href: `securitySolution/rules/id/${mockDetailName}?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
        {
          text: 'Edit',
          href: '',
        },
      ]);
    });

    test('should return Cases breadcrumbs when supplied case pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('case', '/', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Cases',
          href:
            "securitySolution/case?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
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
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Cases',
          href:
            "securitySolution/case?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
        },
        {
          text: sampleCase.name,
          href: `securitySolution/case/${sampleCase.id}?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))`,
        },
      ]);
    });
    test('should return Admin breadcrumbs when supplied endpoints pathname', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject('administration', '/endpoints', undefined),
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Endpoints',
          href: '',
        },
      ]);
    });

    test('should set "timeline.isOpen" to false when timeline is open', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        {
          ...getMockObject('timelines', '/', undefined),
          timeline: {
            activeTab: TimelineTabs.query,
            id: 'TIMELINE_ID',
            isOpen: true,
            graphEventId: 'GRAPH_EVENT_ID',
          },
        },
        getUrlForAppMock
      );
      expect(breadcrumbs).toEqual([
        { text: 'Security', href: 'securitySolution/overview' },
        {
          text: 'Timelines',
          href:
            "securitySolution/timelines?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))&timeline=(activeTab:query,graphEventId:GRAPH_EVENT_ID,id:TIMELINE_ID,isOpen:!f)",
        },
      ]);
    });
  });

  describe('setBreadcrumbs()', () => {
    test('should call chrome breadcrumb service with correct breadcrumbs', () => {
      const navigateToUrlMock = jest.fn();
      setBreadcrumbs(
        getMockObject('hosts', '/', hostName),
        chromeMock,
        getUrlForAppMock,
        navigateToUrlMock
      );
      expect(setBreadcrumbsMock).toBeCalledWith([
        expect.objectContaining({
          text: 'Security',
          href: 'securitySolution/overview',
          onClick: expect.any(Function),
        }),
        expect.objectContaining({
          text: 'Hosts',
          href:
            "securitySolution/hosts?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
          onClick: expect.any(Function),
        }),
        expect.objectContaining({
          text: 'siem-kibana',
          href:
            "securitySolution/hosts/siem-kibana?sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2019-05-16T23:10:43.696Z',fromStr:now-24h,kind:relative,to:'2019-05-17T23:10:43.697Z',toStr:now)))",
          onClick: expect.any(Function),
        }),
        {
          text: 'Authentications',
          href: '',
        },
      ]);
    });
  });
});

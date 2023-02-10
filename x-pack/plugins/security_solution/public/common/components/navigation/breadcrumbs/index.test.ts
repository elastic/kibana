/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../mock/match_media';
import { encodeIpv6 } from '../../../lib/helpers';
import type { ObjectWithNavTabs } from '.';
import { getBreadcrumbsForRoute, useSetBreadcrumbs } from '.';
import { HostsTableType } from '../../../../explore/hosts/store/model';
import type { RouteSpyState } from '../../../utils/route/types';
import { NetworkRouteType } from '../../../../explore/network/pages/navigation/types';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { AdministrationSubTab } from '../../../../management/types';
import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { useIsGroupedNavigationEnabled } from '../helpers';
import { navTabs } from '../../../../app/home/home_navigations';
import { links } from '../../../links/app_links';
import { updateAppLinks } from '../../../links';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { AlertDetailRouteType } from '../../../../detections/pages/alert_details/types';
import { UsersTableType } from '../../../../explore/users/store/model';

jest.mock('../../../hooks/use_selector');

const mockUseIsGroupedNavigationEnabled = useIsGroupedNavigationEnabled as jest.Mock;
jest.mock('../helpers', () => {
  const original = jest.requireActual('../helpers');
  return {
    ...original,
    useIsGroupedNavigationEnabled: jest.fn(),
  };
});

const setBreadcrumbsMock = jest.fn();
const chromeMock = {
  setBreadcrumbs: setBreadcrumbsMock,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any;

const getMockObject = (
  pageName: SecurityPageName,
  pathName: string,
  detailName: string | undefined
): RouteSpyState & ObjectWithNavTabs => {
  switch (pageName) {
    case SecurityPageName.hosts:
      return {
        detailName,
        navTabs,
        pageName,
        pathName,
        search: '',
        tabName: HostsTableType.authentications,
      };

    case SecurityPageName.users:
      return {
        detailName,
        navTabs,
        pageName,
        pathName,
        search: '',
        tabName: UsersTableType.allUsers,
      };

    case SecurityPageName.network:
      return {
        detailName,
        navTabs,
        pageName,
        pathName,
        search: '',
        tabName: NetworkRouteType.flows,
      };

    case SecurityPageName.administration:
      return {
        detailName,
        navTabs,
        pageName,
        pathName,
        search: '',
        tabName: AdministrationSubTab.endpoints,
      };

    case SecurityPageName.alerts:
      return {
        detailName,
        navTabs,
        pageName,
        pathName,
        search: '',
        tabName: AlertDetailRouteType.summary,
      };

    default:
      return {
        detailName,
        navTabs,
        pageName,
        pathName,
        search: '',
      } as RouteSpyState & ObjectWithNavTabs;
  }
};

(useDeepEqualSelector as jest.Mock).mockImplementation(() => {
  return {
    urlState: {
      query: { query: '', language: 'kuery' },
      filters: [],
      timeline: {
        activeTab: TimelineTabs.query,
        id: '',
        isOpen: false,
        graphEventId: '',
      },
    },
  };
});

// The string returned is different from what getSecuritySolutionUrl returns, but does not matter for the purposes of this test.
const getSecuritySolutionUrl: GetSecuritySolutionUrl = ({
  deepLinkId,
  path,
}: {
  deepLinkId?: string;
  path?: string;
  absolute?: boolean;
}) => `${APP_UI_ID}${deepLinkId ? `/${deepLinkId}` : ''}${path ?? ''}`;

jest.mock('../../../lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: {
        chrome: undefined,
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
            `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
        },
      },
    }),
  };
});

const securityBreadCrumb = {
  href: 'securitySolutionUI/get_started',
  text: 'Security',
};

const hostsBreadcrumbs = {
  href: 'securitySolutionUI/hosts',
  text: 'Hosts',
};

const networkBreadcrumb = {
  text: 'Network',
  href: 'securitySolutionUI/network',
};

const exploreBreadcrumbs = {
  href: 'securitySolutionUI/explore',
  text: 'Explore',
};

const rulesBReadcrumb = {
  text: 'Rules',
  href: 'securitySolutionUI/rules',
};

const exceptionsBReadcrumb = {
  text: 'Shared Exception Lists',
  href: 'securitySolutionUI/exceptions',
};

const manageBreadcrumbs = {
  text: 'Manage',
  href: 'securitySolutionUI/administration',
};

describe('Navigation Breadcrumbs', () => {
  beforeAll(() => {
    updateAppLinks(links, {
      experimentalFeatures: allowedExperimentalValues,
      capabilities: {
        navLinks: {},
        management: {},
        catalogue: {},
        actions: { show: true, crud: true },
        siem: {
          show: true,
          crud: true,
        },
      },
    });
  });

  const hostName = 'siem-kibana';

  const ipv4 = '192.0.2.255';
  const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
  const ipv6Encoded = encodeIpv6(ipv6);

  describe('Old Architecture', () => {
    beforeAll(() => {
      mockUseIsGroupedNavigationEnabled.mockReturnValue(false);
    });

    describe('getBreadcrumbsForRoute', () => {
      test('should return Overview breadcrumbs when supplied overview pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.overview, '/', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            href: '',
            text: 'Overview',
          },
        ]);
      });

      test('should return Host breadcrumbs when supplied hosts pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.hosts, '/', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          hostsBreadcrumbs,
          {
            href: '',
            text: 'Authentications',
          },
        ]);
      });

      test('should return Network breadcrumbs when supplied network pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.network, '/', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          networkBreadcrumb,
          {
            text: 'Flows',
            href: '',
          },
        ]);
      });

      test('should return Timelines breadcrumbs when supplied timelines pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.timelines, '/', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Timelines',
            href: '',
          },
        ]);
      });

      test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.hosts, '/', hostName),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          hostsBreadcrumbs,
          {
            text: 'siem-kibana',
            href: 'securitySolutionUI/hosts/name/siem-kibana',
          },
          { text: 'Authentications', href: '' },
        ]);
      });

      test('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.network, '/', ipv4),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          networkBreadcrumb,
          {
            text: ipv4,
            href: `securitySolutionUI/network/ip/${ipv4}/source/flows`,
          },
          { text: 'Flows', href: '' },
        ]);
      });

      test('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.network, '/', ipv6Encoded),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          networkBreadcrumb,
          {
            text: ipv6,
            href: `securitySolutionUI/network/ip/${ipv6Encoded}/source/flows`,
          },
          { text: 'Flows', href: '' },
        ]);
      });

      test('should return Alerts breadcrumbs when supplied alerts pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.alerts, '/alerts', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Alerts',
            href: 'securitySolutionUI/alerts',
          },
          {
            text: 'Summary',
            href: '',
          },
        ]);
      });

      test('should return Exceptions breadcrumbs when supplied exceptions pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.exceptions, '/exceptions', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Shared Exception Lists',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.rules, '/rules', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Rules',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules Creation pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.rules, '/rules/create', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          rulesBReadcrumb,
          {
            text: 'Create',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules Details pageName', () => {
        const mockDetailName = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
        const mockRuleName = 'ALERT_RULE_NAME';
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(SecurityPageName.rules, `/rules/id/${mockDetailName}`, undefined),
            detailName: mockDetailName,
            state: {
              ruleName: mockRuleName,
            },
          },
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          rulesBReadcrumb,
          {
            text: 'ALERT_RULE_NAME',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules Edit pageName', () => {
        const mockDetailName = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
        const mockRuleName = 'ALERT_RULE_NAME';
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(SecurityPageName.rules, `/rules/id/${mockDetailName}/edit`, undefined),
            detailName: mockDetailName,
            state: {
              ruleName: mockRuleName,
            },
          },
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          rulesBReadcrumb,
          {
            text: 'ALERT_RULE_NAME',
            href: `securitySolutionUI/rules/id/${mockDetailName}`,
          },
          {
            text: 'Edit',
            href: '',
          },
        ]);
      });

      test('should return null breadcrumbs when supplied Cases pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.case, '/', undefined),
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual(null);
      });

      test('should return null breadcrumbs when supplied Cases details pageName', () => {
        const sampleCase = {
          id: 'my-case-id',
          name: 'Case name',
        };
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(SecurityPageName.case, `/${sampleCase.id}`, sampleCase.id),
            state: { caseTitle: sampleCase.name },
          },
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual(null);
      });

      test('should return Endpoints breadcrumbs when supplied endpoints pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.endpoints, '/endpoints', undefined),
          getSecuritySolutionUrl,
          false
        );

        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Endpoints',
            href: '',
          },
        ]);
      });

      test('should return Exceptions breadcrumbs when supplied exception Details pageName', () => {
        const mockListName = 'new shared list';
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(
              SecurityPageName.exceptions,
              `/exceptions/details/${mockListName}`,
              undefined
            ),
            state: {
              listName: mockListName,
            },
          },
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exceptionsBReadcrumb,
          {
            text: mockListName,
            href: ``,
          },
        ]);
      });
    });

    describe('setBreadcrumbs()', () => {
      test('should call chrome breadcrumb service with correct breadcrumbs', () => {
        const navigateToUrlMock = jest.fn();
        const { result } = renderHook(() => useSetBreadcrumbs(), { wrapper: TestProviders });
        result.current(
          getMockObject(SecurityPageName.hosts, '/', hostName),
          chromeMock,
          navigateToUrlMock
        );

        expect(setBreadcrumbsMock).toBeCalledWith([
          expect.objectContaining({
            text: 'Security',
            href: 'securitySolutionUI/get_started',
            onClick: expect.any(Function),
          }),
          expect.objectContaining({
            text: 'Hosts',
            href: 'securitySolutionUI/hosts',
            onClick: expect.any(Function),
          }),
          expect.objectContaining({
            text: 'siem-kibana',
            href: 'securitySolutionUI/hosts/name/siem-kibana',
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

  describe('New Architecture', () => {
    beforeAll(() => {
      mockUseIsGroupedNavigationEnabled.mockReturnValue(true);
    });

    describe('getBreadcrumbsForRoute', () => {
      test('should return Overview breadcrumbs when supplied overview pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.overview, '/', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            href: 'securitySolutionUI/dashboards',
            text: 'Dashboards',
          },
          {
            href: '',
            text: 'Overview',
          },
        ]);
      });

      test('should return Host breadcrumbs when supplied hosts pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.hosts, '/', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exploreBreadcrumbs,
          hostsBreadcrumbs,
          {
            href: '',
            text: 'Authentications',
          },
        ]);
      });

      test('should return Network breadcrumbs when supplied network pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.network, '/', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exploreBreadcrumbs,
          networkBreadcrumb,
          {
            text: 'Flows',
            href: '',
          },
        ]);
      });

      test('should return Timelines breadcrumbs when supplied timelines pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.timelines, '/', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Timelines',
            href: '',
          },
        ]);
      });

      test('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.hosts, '/', hostName),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exploreBreadcrumbs,
          hostsBreadcrumbs,
          {
            text: 'siem-kibana',
            href: 'securitySolutionUI/hosts/name/siem-kibana',
          },
          { text: 'Authentications', href: '' },
        ]);
      });

      test('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.network, '/', ipv4),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exploreBreadcrumbs,
          networkBreadcrumb,
          {
            text: ipv4,
            href: `securitySolutionUI/network/ip/${ipv4}/source/flows`,
          },
          { text: 'Flows', href: '' },
        ]);
      });

      test('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.network, '/', ipv6Encoded),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exploreBreadcrumbs,
          networkBreadcrumb,
          {
            text: ipv6,
            href: `securitySolutionUI/network/ip/${ipv6Encoded}/source/flows`,
          },
          { text: 'Flows', href: '' },
        ]);
      });

      test('should return Alerts breadcrumbs when supplied alerts pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.alerts, '/alerts', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Alerts',
            href: 'securitySolutionUI/alerts',
          },
          {
            text: 'Summary',
            href: '',
          },
        ]);
      });

      test('should return Exceptions breadcrumbs when supplied exceptions pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.exceptions, '/exceptions', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          manageBreadcrumbs,
          {
            text: 'Shared Exception Lists',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.rules, '/rules', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          manageBreadcrumbs,
          {
            text: 'Rules',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules Creation pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.rules, '/rules/create', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          manageBreadcrumbs,
          rulesBReadcrumb,
          {
            text: 'Create',
            href: '',
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules Details pageName', () => {
        const mockDetailName = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
        const mockRuleName = 'ALERT_RULE_NAME';
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(SecurityPageName.rules, `/rules/id/${mockDetailName}`, undefined),
            detailName: mockDetailName,
            state: {
              ruleName: mockRuleName,
            },
          },
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          manageBreadcrumbs,
          rulesBReadcrumb,
          {
            text: mockRuleName,
            href: ``,
          },
        ]);
      });

      test('should return Rules breadcrumbs when supplied rules Edit pageName', () => {
        const mockDetailName = '5a4a0460-d822-11eb-8962-bfd4aff0a9b3';
        const mockRuleName = 'ALERT_RULE_NAME';
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(SecurityPageName.rules, `/rules/id/${mockDetailName}/edit`, undefined),
            detailName: mockDetailName,
            state: {
              ruleName: mockRuleName,
            },
          },
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          manageBreadcrumbs,
          rulesBReadcrumb,
          {
            text: 'ALERT_RULE_NAME',
            href: `securitySolutionUI/rules/id/${mockDetailName}`,
          },
          {
            text: 'Edit',
            href: '',
          },
        ]);
      });

      test('should return null breadcrumbs when supplied Cases pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.case, '/', undefined),
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual(null);
      });

      test('should return null breadcrumbs when supplied Cases details pageName', () => {
        const sampleCase = {
          id: 'my-case-id',
          name: 'Case name',
        };
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(SecurityPageName.case, `/${sampleCase.id}`, sampleCase.id),
            state: { caseTitle: sampleCase.name },
          },
          getSecuritySolutionUrl,
          true
        );
        expect(breadcrumbs).toEqual(null);
      });

      test('should return Endpoints breadcrumbs when supplied endpoints pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.endpoints, '/', undefined),
          getSecuritySolutionUrl,
          true
        );

        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          manageBreadcrumbs,
          {
            text: 'Endpoints',
            href: '',
          },
        ]);
      });

      test('should return Admin breadcrumbs when supplied admin pageName', () => {
        const breadcrumbs = getBreadcrumbsForRoute(
          getMockObject(SecurityPageName.administration, '/', undefined),
          getSecuritySolutionUrl,
          true
        );

        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          {
            text: 'Manage',
            href: '',
          },
        ]);
      });
      test('should return Exceptions breadcrumbs when supplied exception Details pageName', () => {
        const mockListName = 'new shared list';
        const breadcrumbs = getBreadcrumbsForRoute(
          {
            ...getMockObject(
              SecurityPageName.exceptions,
              `/exceptions/details/${mockListName}`,
              undefined
            ),
            state: {
              listName: mockListName,
            },
          },
          getSecuritySolutionUrl,
          false
        );
        expect(breadcrumbs).toEqual([
          securityBreadCrumb,
          exceptionsBReadcrumb,
          {
            text: mockListName,
            href: ``,
          },
        ]);
      });
    });

    describe('setBreadcrumbs()', () => {
      test('should call chrome breadcrumb service with correct breadcrumbs', () => {
        const navigateToUrlMock = jest.fn();
        const { result } = renderHook(() => useSetBreadcrumbs(), { wrapper: TestProviders });
        result.current(
          getMockObject(SecurityPageName.hosts, '/', hostName),
          chromeMock,
          navigateToUrlMock
        );

        expect(setBreadcrumbsMock).toBeCalledWith([
          expect.objectContaining({
            text: 'Security',
            href: 'securitySolutionUI/get_started',
            onClick: expect.any(Function),
          }),
          expect.objectContaining({
            text: 'Explore',
            href: 'securitySolutionUI/explore',
            onClick: expect.any(Function),
          }),
          expect.objectContaining({
            text: 'Hosts',
            href: 'securitySolutionUI/hosts',
            onClick: expect.any(Function),
          }),
          expect.objectContaining({
            text: 'siem-kibana',
            href: 'securitySolutionUI/hosts/name/siem-kibana',
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
});

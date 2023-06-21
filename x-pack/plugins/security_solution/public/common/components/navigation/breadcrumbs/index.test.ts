/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../mock/match_media';
import { encodeIpv6 } from '../../../lib/helpers';
import { getBreadcrumbsForRoute, useBreadcrumbs } from '.';
import { HostsTableType } from '../../../../explore/hosts/store/model';
import type { RouteSpyState } from '../../../utils/route/types';
import { NetworkRouteType } from '../../../../explore/network/pages/navigation/types';
import { AdministrationSubTab } from '../../../../management/types';
import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../mock';
import type { GetSecuritySolutionUrl } from '../../link_to';
import { APP_UI_ID, SecurityPageName } from '../../../../../common/constants';
import { links } from '../../../links/app_links';
import { updateAppLinks } from '../../../links';
import { allowedExperimentalValues } from '../../../../../common/experimental_features';
import { AlertDetailRouteType } from '../../../../detections/pages/alert_details/types';
import { UsersTableType } from '../../../../explore/users/store/model';
import { UpsellingService } from '../../../lib/upsellings';

const mockUseRouteSpy = jest.fn();
jest.mock('../../../utils/route/use_route_spy', () => ({
  useRouteSpy: () => mockUseRouteSpy(),
}));

const getMockObject = (
  pageName: SecurityPageName,
  pathName: string,
  detailName: string | undefined
): RouteSpyState => {
  switch (pageName) {
    case SecurityPageName.hosts:
      return {
        detailName,
        pageName,
        pathName,
        search: '',
        tabName: HostsTableType.authentications,
      };

    case SecurityPageName.users:
      return {
        detailName,
        pageName,
        pathName,
        search: '',
        tabName: UsersTableType.allUsers,
      };

    case SecurityPageName.network:
      return {
        detailName,
        pageName,
        pathName,
        search: '',
        tabName: NetworkRouteType.flows,
      };

    case SecurityPageName.administration:
      return {
        detailName,
        pageName,
        pathName,
        search: '',
        tabName: AdministrationSubTab.endpoints,
      };

    case SecurityPageName.alerts:
      return {
        detailName,
        pageName,
        pathName,
        search: '',
        tabName: AlertDetailRouteType.summary,
      };

    default:
      return {
        detailName,
        pageName,
        pathName,
        search: '',
      } as RouteSpyState;
  }
};

// The string returned is different from what getSecuritySolutionUrl returns, but does not matter for the purposes of this test.
const getSecuritySolutionUrl: GetSecuritySolutionUrl = ({
  deepLinkId,
  path,
}: {
  deepLinkId?: string;
  path?: string;
  absolute?: boolean;
}) => `${APP_UI_ID}${deepLinkId ? `/${deepLinkId}` : ''}${path ?? ''}`;

const mockSetBreadcrumbs = jest.fn();
jest.mock('../../../lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: {
        chrome: {
          setBreadcrumbs: mockSetBreadcrumbs,
        },
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
            `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
        },
      },
    }),
  };
});

const hostName = 'siem-kibana';

const ipv4 = '192.0.2.255';
const ipv6 = '2001:db8:ffff:ffff:ffff:ffff:ffff:ffff';
const ipv6Encoded = encodeIpv6(ipv6);

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
      upselling: new UpsellingService(),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBreadcrumbsForRoute', () => {
    it('should return Overview breadcrumbs when supplied overview pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.overview, '/', undefined),
        getSecuritySolutionUrl
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

    it('should return Host breadcrumbs when supplied hosts pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.hosts, '/', undefined),
        getSecuritySolutionUrl
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

    it('should return Network breadcrumbs when supplied network pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.network, '/', undefined),
        getSecuritySolutionUrl
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

    it('should return Timelines breadcrumbs when supplied timelines pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.timelines, '/', undefined),
        getSecuritySolutionUrl
      );
      expect(breadcrumbs).toEqual([
        securityBreadCrumb,
        {
          text: 'Timelines',
          href: '',
        },
      ]);
    });

    it('should return Host Details breadcrumbs when supplied a pathname with hostName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.hosts, '/', hostName),
        getSecuritySolutionUrl
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

    it('should return IP Details breadcrumbs when supplied pathname with ipv4', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.network, '/', ipv4),
        getSecuritySolutionUrl
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

    it('should return IP Details breadcrumbs when supplied pathname with ipv6', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.network, '/', ipv6Encoded),
        getSecuritySolutionUrl
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

    it('should return Alerts breadcrumbs when supplied alerts pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.alerts, '/alerts', undefined),
        getSecuritySolutionUrl
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

    it('should return Exceptions breadcrumbs when supplied exceptions pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.exceptions, '/exceptions', undefined),
        getSecuritySolutionUrl
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

    it('should return Rules breadcrumbs when supplied rules pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.rules, '/rules', undefined),
        getSecuritySolutionUrl
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

    it('should return Rules breadcrumbs when supplied rules Creation pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.rules, '/rules/create', undefined),
        getSecuritySolutionUrl
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

    it('should return Rules breadcrumbs when supplied rules Details pageName', () => {
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
        getSecuritySolutionUrl
      );
      expect(breadcrumbs).toEqual([
        securityBreadCrumb,
        manageBreadcrumbs,
        rulesBReadcrumb,
        {
          text: mockRuleName,
          href: `securitySolutionUI/rules/id/${mockDetailName}`,
        },
        {
          text: 'Deleted rule',
          href: '',
        },
      ]);
    });

    it('should return Rules breadcrumbs when supplied rules Edit pageName', () => {
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
        getSecuritySolutionUrl
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

    it('should return null breadcrumbs when supplied Cases pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.case, '/', undefined),
        getSecuritySolutionUrl
      );
      expect(breadcrumbs).toEqual(null);
    });

    it('should return null breadcrumbs when supplied Cases details pageName', () => {
      const sampleCase = {
        id: 'my-case-id',
        name: 'Case name',
      };
      const breadcrumbs = getBreadcrumbsForRoute(
        {
          ...getMockObject(SecurityPageName.case, `/${sampleCase.id}`, sampleCase.id),
          state: { caseTitle: sampleCase.name },
        },
        getSecuritySolutionUrl
      );
      expect(breadcrumbs).toEqual(null);
    });

    it('should return Endpoints breadcrumbs when supplied endpoints pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.endpoints, '/', undefined),
        getSecuritySolutionUrl
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

    it('should return Admin breadcrumbs when supplied admin pageName', () => {
      const breadcrumbs = getBreadcrumbsForRoute(
        getMockObject(SecurityPageName.administration, '/', undefined),
        getSecuritySolutionUrl
      );

      expect(breadcrumbs).toEqual([
        securityBreadCrumb,
        {
          text: 'Manage',
          href: '',
        },
      ]);
    });
    it('should return Exceptions breadcrumbs when supplied exception Details pageName', () => {
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
        getSecuritySolutionUrl
      );
      expect(breadcrumbs).toEqual([
        securityBreadCrumb,
        manageBreadcrumbs,
        exceptionsBReadcrumb,
        {
          text: mockListName,
          href: ``,
        },
      ]);
    });
  });

  describe('setBreadcrumbs()', () => {
    it('should call chrome breadcrumb service with correct breadcrumbs', () => {
      mockUseRouteSpy.mockReturnValueOnce([getMockObject(SecurityPageName.hosts, '/', hostName)]);
      renderHook(useBreadcrumbs, {
        initialProps: { isEnabled: true },
        wrapper: TestProviders,
      });

      expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
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

    it('should not call chrome breadcrumb service when not enabled', () => {
      mockUseRouteSpy.mockReturnValueOnce([getMockObject(SecurityPageName.hosts, '/', hostName)]);
      renderHook(useBreadcrumbs, {
        initialProps: { isEnabled: false },
        wrapper: TestProviders,
      });
      expect(mockSetBreadcrumbs).not.toHaveBeenCalled();
    });
  });
});

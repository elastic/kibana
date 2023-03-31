/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./nav_link_helpers', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));

import { setMockValues, mockKibanaValues } from '../../__mocks__/kea_logic';

import { EuiSideNavItemType } from '@elastic/eui';

import { DEFAULT_PRODUCT_FEATURES } from '../../../../common/constants';
import { ProductAccess, ProductFeatures } from '../../../../common/types';

import {
  useEnterpriseSearchNav,
  useEnterpriseSearchEngineNav,
  useEnterpriseSearchAnalyticsNav,
} from './nav';

const DEFAULT_PRODUCT_ACCESS: ProductAccess = {
  hasAppSearchAccess: true,
  hasSearchEnginesAccess: false,
  hasWorkplaceSearchAccess: true,
};

describe('useEnterpriseSearchContentNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.uiSettings.get.mockReturnValue(false);
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    const fullProductAccess: ProductAccess = DEFAULT_PRODUCT_ACCESS;
    setMockValues({ productAccess: fullProductAccess, productFeatures: DEFAULT_PRODUCT_FEATURES });

    expect(useEnterpriseSearchNav()).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
        name: 'Overview',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Getting started',
          },
        ],
      },
      {
        id: 'content',
        items: [
          {
            href: '/app/enterprise_search/content/search_indices',
            id: 'search_indices',
            name: 'Indices',
          },
          {
            href: '/app/enterprise_search/content/settings',
            id: 'settings',
            name: 'Settings',
          },
        ],
        name: 'Content',
      },
      {
        id: 'enterpriseSearchAnalytics',
        items: [
          {
            href: '/app/enterprise_search/analytics',
            id: 'analytics_collections',
            name: 'Collections',
          },
        ],
        name: 'Behavioral Analytics',
      },
      {
        id: 'search',
        items: [
          {
            href: '/app/enterprise_search/app_search',
            id: 'app_search',
            name: 'App Search',
          },
          {
            href: '/app/enterprise_search/workplace_search',
            id: 'workplace_search',
            name: 'Workplace Search',
          },
          {
            href: '/app/enterprise_search/search_experiences',
            id: 'searchExperiences',
            name: 'Search Experiences',
          },
        ],
        name: 'Enterprise Search',
      },
    ]);
  });

  it('excludes legacy products when the user has no access to them', () => {
    const noProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: false,
    };

    setMockValues({ productAccess: noProductAccess, productFeatures: DEFAULT_PRODUCT_FEATURES });
    mockKibanaValues.uiSettings.get.mockReturnValue(false);

    const esNav = useEnterpriseSearchNav();
    const searchNav = esNav?.find((item) => item.id === 'search');
    expect(searchNav).not.toBeUndefined();
    expect(searchNav).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
        },
      ],
      name: 'Enterprise Search',
    });
  });

  it('excludes App Search when the user has no access to it', () => {
    const workplaceSearchProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: true,
    };

    setMockValues({
      productAccess: workplaceSearchProductAccess,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });

    const esNav = useEnterpriseSearchNav();
    const searchNav = esNav?.find((item) => item.id === 'search');
    expect(searchNav).not.toBeUndefined();
    expect(searchNav).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/workplace_search',
          id: 'workplace_search',
          name: 'Workplace Search',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
        },
      ],
      name: 'Enterprise Search',
    });
  });

  it('excludes Workplace Search when the user has no access to it', () => {
    const appSearchProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasWorkplaceSearchAccess: false,
    };

    setMockValues({
      productAccess: appSearchProductAccess,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });

    const esNav = useEnterpriseSearchNav();
    const searchNav = esNav?.find((item) => item.id === 'search');
    expect(searchNav).not.toBeUndefined();
    expect(searchNav).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/app_search',
          id: 'app_search',
          name: 'App Search',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
        },
      ],
      name: 'Enterprise Search',
    });
  });

  it('excludes engines when feature flag is off', () => {
    const fullProductAccess: ProductAccess = DEFAULT_PRODUCT_ACCESS;
    setMockValues({ productAccess: fullProductAccess, productFeatures: DEFAULT_PRODUCT_FEATURES });

    const esNav = useEnterpriseSearchNav();
    expect(esNav?.find((item) => item.id === 'enginesSearch')).toBeUndefined();
  });
});

describe('useEnterpriseSearchContentNav Engines feature flag', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    setMockValues({
      productAccess: DEFAULT_PRODUCT_ACCESS,
      productFeatures: { ...DEFAULT_PRODUCT_FEATURES, hasSearchApplications: true },
    });

    expect(useEnterpriseSearchNav()).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
        name: 'Overview',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Getting started',
          },
        ],
      },
      {
        id: 'content',
        items: [
          {
            href: '/app/enterprise_search/content/search_indices',
            id: 'search_indices',
            name: 'Indices',
          },
          {
            href: '/app/enterprise_search/content/settings',
            id: 'settings',
            items: undefined,
            name: 'Settings',
          },
        ],
        name: 'Content',
      },
      {
        id: 'applications',
        name: 'Applications',
        items: [
          {
            id: 'search_applications',
            name: 'Search Applications',
            href: '/app/enterprise_search/content/engines',
          },
          {
            href: '/app/enterprise_search/analytics',
            id: 'analytics_collections',
            name: 'Analytics',
          },
        ],
      },
      {
        id: 'enterpriseSearch',
        items: [
          {
            href: '/app/enterprise_search/app_search',
            id: 'app_search',
            name: 'App Search',
          },
          {
            href: '/app/enterprise_search/workplace_search',
            id: 'workplace_search',
            name: 'Workplace Search',
          },
          {
            id: 'searchExperiences',
            name: 'Search Experiences',
            href: '/app/enterprise_search/search_experiences',
          },
        ],
        name: 'Enterprise Search',
      },
    ]);
  });

  it('excludes ent-search apps when the user has no access to them', () => {
    const mockProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: false,
    };
    setMockValues({
      productAccess: mockProductAccess,
      productFeatures: {
        ...DEFAULT_PRODUCT_FEATURES,
        hasSearchApplications: true,
      },
    });

    const esNav = useEnterpriseSearchNav();
    const entSearchNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(entSearchNav).not.toBeUndefined();
    expect(entSearchNav).toEqual({
      id: 'enterpriseSearch',
      items: [
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
        },
      ],
      name: 'Enterprise Search',
    });
  });
  it('excludes App Search when the user has no access to it', () => {
    const mockProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: false,
      hasSearchEnginesAccess: true,
    };
    setMockValues({
      productAccess: mockProductAccess,
      productFeatures: {
        ...DEFAULT_PRODUCT_FEATURES,
        hasSearchApplications: true,
      },
    });

    const esNav = useEnterpriseSearchNav();
    const entSearchNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(entSearchNav).not.toBeUndefined();
    expect(entSearchNav).toEqual({
      id: 'enterpriseSearch',
      items: [
        {
          href: '/app/enterprise_search/workplace_search',
          id: 'workplace_search',
          name: 'Workplace Search',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
        },
      ],
      name: 'Enterprise Search',
    });
  });
  it('excludes Workplace Search when the user has no access to it', () => {
    const mockProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: true,
      hasSearchEnginesAccess: true,
      hasWorkplaceSearchAccess: false,
    };
    setMockValues({
      productAccess: mockProductAccess,
      productFeatures: {
        ...DEFAULT_PRODUCT_FEATURES,
        hasSearchApplications: true,
      },
    });

    const esNav = useEnterpriseSearchNav();
    const entSearchNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(entSearchNav).not.toBeUndefined();
    expect(entSearchNav).toEqual({
      id: 'enterpriseSearch',
      items: [
        {
          href: '/app/enterprise_search/app_search',
          id: 'app_search',
          name: 'App Search',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
        },
      ],
      name: 'Enterprise Search',
    });
  });
});

describe('useEnterpriseSearchEngineNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.uiSettings.get.mockReturnValue(true);
    const mockFeatures: ProductFeatures = {
      ...DEFAULT_PRODUCT_FEATURES,
      hasSearchApplications: true,
    };
    setMockValues({ productAccess: DEFAULT_PRODUCT_ACCESS, productFeatures: mockFeatures });
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    expect(useEnterpriseSearchEngineNav()).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
        name: 'Overview',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Getting started',
          },
        ],
      },
      {
        id: 'content',
        items: [
          {
            href: '/app/enterprise_search/content/search_indices',
            id: 'search_indices',
            name: 'Indices',
          },
          {
            href: '/app/enterprise_search/content/settings',
            id: 'settings',
            items: undefined,
            name: 'Settings',
          },
        ],
        name: 'Content',
      },
      {
        id: 'applications',
        name: 'Applications',
        items: [
          {
            href: '/app/enterprise_search/content/engines',
            id: 'search_applications',
            name: 'Search Applications',
          },
          {
            href: '/app/enterprise_search/analytics',
            id: 'analytics_collections',
            name: 'Analytics',
          },
        ],
      },
      {
        id: 'enterpriseSearch',
        items: [
          {
            href: '/app/enterprise_search/app_search',
            id: 'app_search',
            name: 'App Search',
          },
          {
            href: '/app/enterprise_search/workplace_search',
            id: 'workplace_search',
            name: 'Workplace Search',
          },
          {
            href: '/app/enterprise_search/search_experiences',
            id: 'searchExperiences',
            name: 'Search Experiences',
          },
        ],
        name: 'Enterprise Search',
      },
    ]);
  });

  it('returns selected engine sub nav items', () => {
    const searchAppName = 'my-test-engine';
    const navItems = useEnterpriseSearchEngineNav(searchAppName);
    expect(navItems?.map((ni) => ni.name)).toEqual([
      'Overview',
      'Content',
      'Applications',
      'Enterprise Search',
    ]);
    const applicationsItem = navItems?.find((ni) => ni.id === 'applications');
    expect(applicationsItem).not.toBeUndefined();
    expect(applicationsItem!.items).not.toBeUndefined();
    // @ts-ignore
    const searchAppsItem: EuiSideNavItemType<unknown> = applicationsItem?.items?.find(
      (si: EuiSideNavItemType<unknown>) => si.id === 'search_applications'
    );
    expect(searchAppsItem).not.toBeUndefined();
    expect(searchAppsItem!.items).not.toBeUndefined();
    expect(searchAppsItem!.items).toHaveLength(1);

    // @ts-ignore
    const searchAppItem: EuiSideNavItemType<unknown> = searchAppsItem!.items[0];
    expect(searchAppItem).toEqual({
      href: `/app/enterprise_search/content/engines/${searchAppName}`,
      id: 'engineId',
      items: [
        {
          href: `/app/enterprise_search/content/engines/${searchAppName}/overview`,
          id: 'enterpriseSearchEngineOverview',
          name: 'Overview',
        },
        {
          href: `/app/enterprise_search/content/engines/${searchAppName}/indices`,
          id: 'enterpriseSearchEngineIndices',
          name: 'Indices',
        },
        {
          href: `/app/enterprise_search/content/engines/${searchAppName}/schema`,
          id: 'enterpriseSearchEngineSchema',
          name: 'Schema',
        },
        {
          href: `/app/enterprise_search/content/engines/${searchAppName}/preview`,
          id: 'enterpriseSearchEnginePreview',
          name: 'Preview',
        },
        {
          href: `/app/enterprise_search/content/engines/${searchAppName}/api`,
          id: 'enterpriseSearchEngineAPI',
          name: 'API',
        },
      ],
      name: searchAppName,
    });
  });

  it('returns selected engine without tabs when isEmpty', () => {
    const searchAppName = 'my-test-engine';
    const navItems = useEnterpriseSearchEngineNav(searchAppName, true);
    expect(navItems?.map((ni) => ni.name)).toEqual([
      'Overview',
      'Content',
      'Applications',
      'Enterprise Search',
    ]);
    const applicationsItem = navItems?.find((ni) => ni.id === 'applications');
    expect(applicationsItem).not.toBeUndefined();
    expect(applicationsItem!.items).not.toBeUndefined();
    // @ts-ignore
    const searchAppsItem: EuiSideNavItemType<unknown> = applicationsItem?.items?.find(
      (si: EuiSideNavItemType<unknown>) => si.id === 'search_applications'
    );
    expect(searchAppsItem).not.toBeUndefined();
    expect(searchAppsItem!.items).not.toBeUndefined();
    expect(searchAppsItem!.items).toHaveLength(1);

    // @ts-ignore
    const searchAppItem: EuiSideNavItemType<unknown> = searchAppsItem!.items[0];
    expect(searchAppItem).toEqual({
      href: `/app/enterprise_search/content/engines/${searchAppName}`,
      id: 'engineId',
      name: searchAppName,
    });
  });
});

describe('useEnterpriseSearchAnalyticsNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({});
  });

  it('returns basic nav all params are empty', () => {
    const navItems = useEnterpriseSearchAnalyticsNav();
    expect(navItems).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
        name: 'Overview',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Getting started',
          },
        ],
      },
      {
        id: 'content',
        items: [
          {
            href: '/app/enterprise_search/content/search_indices',
            id: 'search_indices',
            name: 'Indices',
          },
        ],
        name: 'Content',
      },
      {
        id: 'enterpriseSearchAnalytics',
        items: [
          {
            href: '/app/enterprise_search/analytics',
            id: 'analytics_collections',
            name: 'Collections',
          },
        ],
        name: 'Behavioral Analytics',
      },
      {
        id: 'search',
        items: [
          {
            href: '/app/enterprise_search/app_search',
            id: 'app_search',
            name: 'App Search',
          },
          {
            href: '/app/enterprise_search/workplace_search',
            id: 'workplace_search',
            name: 'Workplace Search',
          },
          {
            href: '/app/enterprise_search/search_experiences',
            id: 'searchExperiences',
            name: 'Search Experiences',
          },
        ],
        name: 'Enterprise Search',
      },
    ]);
  });

  it('returns analytics with no children if only name provided', () => {
    const navItems = useEnterpriseSearchAnalyticsNav('my-test-collection');
    const analyticsParent = navItems.find((item) => item.id === 'enterpriseSearchAnalytics');
    expect(analyticsParent).not.toBeUndefined();
    const analyticsCollectionsNavItem = (
      analyticsParent!.items! as Array<EuiSideNavItemType<unknown>>
    ).find((item) => item.id === 'analytics_collections');
    expect(analyticsCollectionsNavItem).not.toBeUndefined();
    expect(analyticsCollectionsNavItem!.items).toBeUndefined();
  });

  it('returns nav with sub items when name and paths provided', () => {
    const navItems = useEnterpriseSearchAnalyticsNav('my-test-collection', {
      explorer: '/explorer-path',
      integration: '/integration-path',
      overview: '/overview-path',
    });
    const analyticsParent = navItems.find((item) => item.id === 'enterpriseSearchAnalytics');
    expect(analyticsParent).not.toBeUndefined();
    const analyticsCollectionsNavItem = (
      analyticsParent!.items! as Array<EuiSideNavItemType<unknown>>
    ).find((item) => item.id === 'analytics_collections');
    expect(analyticsCollectionsNavItem).not.toBeUndefined();
    expect(analyticsCollectionsNavItem!.items).not.toBeUndefined();
    expect(analyticsCollectionsNavItem!.items).toEqual([
      {
        id: 'analytics_collections',
        items: [
          {
            href: '/app/enterprise_search/analytics/overview-path',
            id: 'enterpriseSearchEngineOverview',
            name: 'Overview',
          },
          {
            href: '/app/enterprise_search/analytics/explorer-path',
            id: 'enterpriseSearchEngineIndices',
            name: 'Explorer',
          },
          {
            href: '/app/enterprise_search/analytics/integration-path',
            id: 'enterpriseSearchEngineSchema',
            name: 'Integration',
          },
        ],
        name: 'my-test-collection',
      },
    ]);
  });

  describe('when search applications are enabled', () => {
    beforeEach(() => {
      const mockFeatures: ProductFeatures = {
        ...DEFAULT_PRODUCT_FEATURES,
        hasSearchApplications: true,
      };
      setMockValues({ productAccess: DEFAULT_PRODUCT_ACCESS, productFeatures: mockFeatures });
    });

    it('returns basic nav all params are empty', () => {
      const navItems = useEnterpriseSearchAnalyticsNav();
      expect(navItems).toEqual([
        {
          href: '/app/enterprise_search/overview',
          id: 'es_overview',
          name: 'Overview',
          items: [
            {
              href: '/app/enterprise_search/elasticsearch',
              id: 'elasticsearch',
              name: 'Getting started',
            },
          ],
        },
        {
          id: 'content',
          items: [
            {
              href: '/app/enterprise_search/content/search_indices',
              id: 'search_indices',
              name: 'Indices',
            },
            {
              href: '/app/enterprise_search/content/settings',
              id: 'settings',
              name: 'Settings',
            },
          ],
          name: 'Content',
        },
        {
          id: 'applications',
          name: 'Applications',
          items: [
            {
              href: '/app/enterprise_search/content/engines',
              id: 'search_applications',
              name: 'Search Applications',
            },
            {
              href: '/app/enterprise_search/analytics',
              id: 'analytics_collections',
              name: 'Analytics',
            },
          ],
        },
        {
          id: 'enterpriseSearch',
          items: [
            {
              href: '/app/enterprise_search/app_search',
              id: 'app_search',
              name: 'App Search',
            },
            {
              href: '/app/enterprise_search/workplace_search',
              id: 'workplace_search',
              name: 'Workplace Search',
            },
            {
              href: '/app/enterprise_search/search_experiences',
              id: 'searchExperiences',
              name: 'Search Experiences',
            },
          ],
          name: 'Enterprise Search',
        },
      ]);
    });

    it('returns analytics with no children if only name provided', () => {
      const navItems = useEnterpriseSearchAnalyticsNav('my-test-collection');
      const analyticsParent = navItems.find((item) => item.id === 'applications');
      expect(analyticsParent).not.toBeUndefined();
      const analyticsCollectionsNavItem = (
        analyticsParent!.items! as Array<EuiSideNavItemType<unknown>>
      ).find((item) => item.id === 'analytics_collections');
      expect(analyticsCollectionsNavItem).not.toBeUndefined();
      expect(analyticsCollectionsNavItem!.items).toBeUndefined();
    });

    it('returns nav with sub items when name and paths provided', () => {
      const navItems = useEnterpriseSearchAnalyticsNav('my-test-collection', {
        explorer: '/explorer-path',
        integration: '/integration-path',
        overview: '/overview-path',
      });
      const analyticsParent = navItems.find((item) => item.id === 'applications');
      expect(analyticsParent).not.toBeUndefined();
      const analyticsCollectionsNavItem = (
        analyticsParent!.items! as Array<EuiSideNavItemType<unknown>>
      ).find((item) => item.id === 'analytics_collections');
      expect(analyticsCollectionsNavItem).not.toBeUndefined();
      expect(analyticsCollectionsNavItem!.items).not.toBeUndefined();
      expect(analyticsCollectionsNavItem!.items).toEqual([
        {
          id: 'analytics_collections',
          items: [
            {
              href: '/app/enterprise_search/analytics/overview-path',
              id: 'enterpriseSearchEngineOverview',
              name: 'Overview',
            },
            {
              href: '/app/enterprise_search/analytics/explorer-path',
              id: 'enterpriseSearchEngineIndices',
              name: 'Explorer',
            },
            {
              href: '/app/enterprise_search/analytics/integration-path',
              id: 'enterpriseSearchEngineSchema',
              name: 'Integration',
            },
          ],
          name: 'my-test-collection',
        },
      ]);
    });
  });
});

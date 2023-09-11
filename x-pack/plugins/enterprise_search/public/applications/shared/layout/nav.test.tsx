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
import { ProductAccess } from '../../../../common/types';

import {
  useEnterpriseSearchNav,
  useEnterpriseSearchApplicationNav,
  useEnterpriseSearchAnalyticsNav,
} from './nav';

const DEFAULT_PRODUCT_ACCESS: ProductAccess = {
  hasAppSearchAccess: true,
  hasWorkplaceSearchAccess: true,
};

describe('useEnterpriseSearchContentNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.uiSettings.get.mockReturnValue(false);
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    const fullProductAccess: ProductAccess = DEFAULT_PRODUCT_ACCESS;
    setMockValues({
      isSidebarEnabled: true,
      productAccess: fullProductAccess,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });

    expect(useEnterpriseSearchNav()).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Elasticsearch',
          },
          {
            href: '/app/enterprise_search/vector_search',
            id: 'vectorSearch',
            name: 'Vector Search',
          },
          {
            href: '/app/enterprise_search/esre',
            id: 'esre',
            name: 'ESRE',
          },
        ],
        name: 'Overview',
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
        items: [
          {
            href: '/app/enterprise_search/applications',
            id: 'searchApplications',
            name: 'Search Applications',
          },
          {
            href: '/app/enterprise_search/analytics',
            id: 'analyticsCollections',
            name: 'Behavioral Analytics',
          },
        ],
        name: 'Applications',
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

    setMockValues({
      isSidebarEnabled: true,
      productAccess: noProductAccess,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });
    mockKibanaValues.uiSettings.get.mockReturnValue(false);

    const esNav = useEnterpriseSearchNav();
    const legacyESNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(legacyESNav).toBeUndefined();
  });

  it('excludes App Search when the user has no access to it', () => {
    const workplaceSearchProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: true,
    };

    setMockValues({
      isSidebarEnabled: true,
      productAccess: workplaceSearchProductAccess,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });

    const esNav = useEnterpriseSearchNav();
    const legacyESNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(legacyESNav).not.toBeUndefined();
    expect(legacyESNav).toEqual({
      id: 'enterpriseSearch',
      items: [
        {
          href: '/app/enterprise_search/workplace_search',
          id: 'workplace_search',
          name: 'Workplace Search',
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
      isSidebarEnabled: true,
      productAccess: appSearchProductAccess,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });

    const esNav = useEnterpriseSearchNav();
    const legacyESNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(legacyESNav).not.toBeUndefined();
    expect(legacyESNav).toEqual({
      id: 'enterpriseSearch',
      items: [
        {
          href: '/app/enterprise_search/app_search',
          id: 'app_search',
          name: 'App Search',
        },
      ],
      name: 'Enterprise Search',
    });
  });
});

describe('useEnterpriseSearchApplicationNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.uiSettings.get.mockReturnValue(true);
    setMockValues({
      isSidebarEnabled: true,
      productAccess: DEFAULT_PRODUCT_ACCESS,
      productFeatures: DEFAULT_PRODUCT_FEATURES,
    });
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    expect(useEnterpriseSearchApplicationNav()).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Elasticsearch',
          },
          {
            href: '/app/enterprise_search/vector_search',
            id: 'vectorSearch',
            name: 'Vector Search',
          },
          {
            href: '/app/enterprise_search/esre',
            id: 'esre',
            name: 'ESRE',
          },
        ],
        name: 'Overview',
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
        items: [
          {
            href: '/app/enterprise_search/applications',
            id: 'searchApplications',
            name: 'Search Applications',
          },
          {
            href: '/app/enterprise_search/analytics',
            id: 'analyticsCollections',
            name: 'Behavioral Analytics',
          },
        ],
        name: 'Applications',
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
        ],
        name: 'Enterprise Search',
      },
    ]);
  });

  it('returns selected engine sub nav items', () => {
    const engineName = 'my-test-engine';
    const navItems = useEnterpriseSearchApplicationNav(engineName);
    expect(navItems?.map((ni) => ni.name)).toEqual([
      'Overview',
      'Content',
      'Applications',
      'Enterprise Search',
    ]);
    const searchItem = navItems?.find((ni) => ni.id === 'applications');
    expect(searchItem).not.toBeUndefined();
    expect(searchItem!.items).not.toBeUndefined();
    // @ts-ignore
    const enginesItem: EuiSideNavItemType<unknown> = searchItem?.items?.find(
      (si: EuiSideNavItemType<unknown>) => si.id === 'searchApplications'
    );
    expect(enginesItem).not.toBeUndefined();
    expect(enginesItem!.items).not.toBeUndefined();
    expect(enginesItem!.items).toHaveLength(1);

    // @ts-ignore
    const engineItem: EuiSideNavItemType<unknown> = enginesItem!.items[0];
    expect(engineItem).toMatchInlineSnapshot(`
      Object {
        "href": "/app/enterprise_search/applications/search_applications/my-test-engine",
        "id": "searchApplicationId",
        "items": Array [
          Object {
            "href": "/app/enterprise_search/applications/search_applications/my-test-engine/docs_explorer",
            "id": "enterpriseSearchApplicationDocsExplorer",
            "items": undefined,
            "name": "Docs Explorer",
          },
          Object {
            "href": "/app/enterprise_search/applications/search_applications/my-test-engine/content",
            "id": "enterpriseSearchApplicationsContent",
            "items": undefined,
            "name": <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
            >
              Content
            </EuiFlexGroup>,
          },
          Object {
            "href": "/app/enterprise_search/applications/search_applications/my-test-engine/connect",
            "id": "enterpriseSearchApplicationConnect",
            "items": undefined,
            "name": "Connect",
          },
        ],
        "name": "my-test-engine",
      }
    `);
  });

  it('returns selected engine without tabs when isEmpty', () => {
    const engineName = 'my-test-engine';
    const navItems = useEnterpriseSearchApplicationNav(engineName, true);
    expect(navItems?.map((ni) => ni.name)).toEqual([
      'Overview',
      'Content',
      'Applications',
      'Enterprise Search',
    ]);
    const searchItem = navItems?.find((ni) => ni.id === 'applications');
    expect(searchItem).not.toBeUndefined();
    expect(searchItem!.items).not.toBeUndefined();
    // @ts-ignore
    const enginesItem: EuiSideNavItemType<unknown> = searchItem?.items?.find(
      (si: EuiSideNavItemType<unknown>) => si.id === 'searchApplications'
    );
    expect(enginesItem).not.toBeUndefined();
    expect(enginesItem!.items).not.toBeUndefined();
    expect(enginesItem!.items).toHaveLength(1);

    // @ts-ignore
    const engineItem: EuiSideNavItemType<unknown> = enginesItem!.items[0];
    expect(engineItem).toEqual({
      href: `/app/enterprise_search/applications/search_applications/${engineName}`,
      id: 'searchApplicationId',
      name: engineName,
    });
  });

  it('returns selected engine with conflict warning when hasSchemaConflicts', () => {
    const engineName = 'my-test-engine';
    const navItems = useEnterpriseSearchApplicationNav(engineName, false, true);

    // @ts-ignore
    const engineItem = navItems
      .find((ni: EuiSideNavItemType<unknown>) => ni.id === 'applications')
      .items.find((ni: EuiSideNavItemType<unknown>) => ni.id === 'searchApplications')
      .items[0].items.find(
        (ni: EuiSideNavItemType<unknown>) => ni.id === 'enterpriseSearchApplicationsContent'
      );

    expect(engineItem).toMatchInlineSnapshot(`
      Object {
        "href": "/app/enterprise_search/applications/search_applications/my-test-engine/content",
        "id": "enterpriseSearchApplicationsContent",
        "items": undefined,
        "name": <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
        >
          Content
          <EuiIcon
            color="danger"
            type="warning"
          />
        </EuiFlexGroup>,
      }
    `);
  });
});

describe('useEnterpriseSearchAnalyticsNav', () => {
  const baseNavs = [
    {
      href: '/app/enterprise_search/overview',
      id: 'es_overview',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
        {
          href: '/app/enterprise_search/vector_search',
          id: 'vectorSearch',
          name: 'Vector Search',
        },
        {
          href: '/app/enterprise_search/esre',
          id: 'esre',
          name: 'ESRE',
        },
      ],
      name: 'Overview',
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
      id: 'applications',
      items: [
        {
          href: '/app/enterprise_search/applications',
          id: 'searchApplications',
          name: 'Search Applications',
        },
        {
          href: '/app/enterprise_search/analytics',
          id: 'analyticsCollections',
          name: 'Behavioral Analytics',
        },
      ],
      name: 'Applications',
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
      ],
      name: 'Enterprise Search',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({
      isSidebarEnabled: true,
    });
  });

  it('returns basic nav all params are empty', () => {
    const navItems = useEnterpriseSearchAnalyticsNav();
    expect(navItems).toEqual(baseNavs);
  });

  it('returns basic nav if only name provided', () => {
    const navItems = useEnterpriseSearchAnalyticsNav('my-test-collection');
    expect(navItems).toEqual(baseNavs);
  });

  it('returns nav with sub items when name and paths provided', () => {
    const navItems = useEnterpriseSearchAnalyticsNav('my-test-collection', {
      explorer: '/explorer-path',
      integration: '/integration-path',
      overview: '/overview-path',
    });
    const applicationsNav = navItems?.find((item) => item.id === 'applications');
    expect(applicationsNav).not.toBeUndefined();
    const analyticsNav = applicationsNav?.items?.[1];
    expect(analyticsNav).not.toBeUndefined();
    expect(analyticsNav).toEqual({
      href: '/app/enterprise_search/analytics',
      id: 'analyticsCollections',
      items: [
        {
          id: 'analyticsCollection',
          items: [
            {
              href: '/app/enterprise_search/analytics/overview-path',
              id: 'analyticsCollectionOverview',
              name: 'Overview',
            },
            {
              href: '/app/enterprise_search/analytics/explorer-path',
              id: 'analyticsCollectionExplorer',
              name: 'Explorer',
            },
            {
              href: '/app/enterprise_search/analytics/integration-path',
              id: 'analyticsCollectionIntegration',
              name: 'Integration',
            },
          ],
          name: 'my-test-collection',
        },
      ],
      name: 'Behavioral Analytics',
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./nav_link_helpers', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));

jest.mock('../../enterprise_search_content/components/search_index/indices/indices_nav', () => ({
  useIndicesNav: () => [],
}));

import { setMockValues, mockKibanaValues } from '../../__mocks__/kea_logic';

import { renderHook } from '@testing-library/react-hooks';

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
const baseNavItems = [
  expect.objectContaining({
    'data-test-subj': 'searchSideNav-Home',
    href: '/app/enterprise_search/overview',
    id: 'home',
    items: undefined,
  }),
  {
    'data-test-subj': 'searchSideNav-Content',
    id: 'content',
    items: [
      {
        'data-test-subj': 'searchSideNav-Indices',
        href: '/app/enterprise_search/content/search_indices',
        id: 'search_indices',
        items: [],
        name: 'Indices',
      },
      {
        'data-test-subj': 'searchSideNav-Connectors',
        href: '/app/enterprise_search/content/connectors',
        id: 'connectors',
        items: undefined,
        name: 'Connectors',
      },
      {
        'data-test-subj': 'searchSideNav-Crawlers',
        href: '/app/enterprise_search/content/crawlers',
        id: 'crawlers',
        items: undefined,
        name: 'Web Crawlers',
      },
    ],
    name: 'Content',
  },
  {
    'data-test-subj': 'searchSideNav-Build',
    id: 'build',
    items: [
      {
        'data-test-subj': 'searchSideNav-Playground',
        href: '/app/enterprise_search/applications/playground',
        id: 'playground',
        items: undefined,
        name: 'Playground',
      },
      {
        'data-test-subj': 'searchSideNav-SearchApplications',
        href: '/app/enterprise_search/applications/search_applications',
        id: 'searchApplications',
        items: undefined,
        name: 'Search Applications',
      },
      {
        'data-test-subj': 'searchSideNav-BehavioralAnalytics',
        href: '/app/enterprise_search/analytics',
        id: 'analyticsCollections',
        items: undefined,
        name: 'Behavioral Analytics',
      },
    ],
    name: 'Build',
  },
  {
    'data-test-subj': 'searchSideNav-Relevance',
    id: 'relevance',
    items: [
      {
        'data-test-subj': 'searchSideNav-InferenceEndpoints',
        href: '/app/elasticsearch/relevance/inference_endpoints',
        id: 'inference_endpoints',
        items: undefined,
        name: 'Inference Endpoints',
      },
    ],
    name: 'Relevance',
  },
  {
    'data-test-subj': 'searchSideNav-GettingStarted',
    id: 'es_getting_started',
    items: [
      {
        'data-test-subj': 'searchSideNav-Elasticsearch',
        href: '/app/enterprise_search/elasticsearch',
        id: 'elasticsearch',
        items: undefined,
        name: 'Elasticsearch',
      },
      {
        'data-test-subj': 'searchSideNav-VectorSearch',
        href: '/app/enterprise_search/vector_search',
        id: 'vectorSearch',
        items: undefined,
        name: 'Vector Search',
      },
      {
        'data-test-subj': 'searchSideNav-SemanticSearch',
        href: '/app/enterprise_search/semantic_search',
        id: 'semanticSearch',
        items: undefined,
        name: 'Semantic Search',
      },
      {
        'data-test-subj': 'searchSideNav-AISearch',
        href: '/app/enterprise_search/ai_search',
        id: 'aiSearch',
        items: undefined,
        name: 'AI Search',
      },
    ],
    name: 'Getting started',
  },
  {
    'data-test-subj': 'searchSideNav-EnterpriseSearch',
    id: 'enterpriseSearch',
    items: [
      {
        'data-test-subj': 'searchSideNav-AppSearch',
        href: '/app/enterprise_search/app_search',
        id: 'app_search',
        items: undefined,
        name: 'App Search',
      },
      {
        'data-test-subj': 'searchSideNav-WorkplaceSearch',
        href: '/app/enterprise_search/workplace_search',
        id: 'workplace_search',
        items: undefined,
        name: 'Workplace Search',
      },
    ],
    name: 'Enterprise Search',
  },
];

const mockNavLinks = [
  {
    id: 'enterpriseSearch',
    url: '/app/enterprise_search/overview',
  },
  {
    id: 'enterpriseSearchContent:searchIndices',
    title: 'Indices',
    url: '/app/enterprise_search/content/search_indices',
  },
  {
    id: 'enterpriseSearchContent:connectors',
    title: 'Connectors',
    url: '/app/enterprise_search/content/connectors',
  },
  {
    id: 'enterpriseSearchContent:webCrawlers',
    title: 'Web Crawlers',
    url: '/app/enterprise_search/content/crawlers',
  },
  {
    id: 'enterpriseSearchApplications:playground',
    title: 'Playground',
    url: '/app/enterprise_search/applications/playground',
  },
  {
    id: 'enterpriseSearchApplications:searchApplications',
    title: 'Search Applications',
    url: '/app/enterprise_search/applications/search_applications',
  },
  {
    id: 'enterpriseSearchAnalytics',
    title: 'Behavioral Analytics',
    url: '/app/enterprise_search/analytics',
  },
  {
    id: 'searchInferenceEndpoints:inferenceEndpoints',
    title: 'Inference Endpoints',
    url: '/app/elasticsearch/relevance/inference_endpoints',
  },
  {
    id: 'appSearch:engines',
    title: 'App Search',
    url: '/app/enterprise_search/app_search',
  },
  {
    id: 'workplaceSearch',
    title: 'Workplace Search',
    url: '/app/enterprise_search/workplace_search',
  },
  {
    id: 'enterpriseSearchElasticsearch',
    title: 'Elasticsearch',
    url: '/app/enterprise_search/elasticsearch',
  },
  {
    id: 'enterpriseSearchVectorSearch',
    title: 'Vector Search',
    url: '/app/enterprise_search/vector_search',
  },
  {
    id: 'enterpriseSearchSemanticSearch',
    title: 'Semantic Search',
    url: '/app/enterprise_search/semantic_search',
  },
  {
    id: 'enterpriseSearchAISearch',
    title: 'AI Search',
    url: '/app/enterprise_search/ai_search',
  },
];

const defaultMockValues = {
  hasEnterpriseLicense: true,
  isSidebarEnabled: true,
  productAccess: DEFAULT_PRODUCT_ACCESS,
  productFeatures: DEFAULT_PRODUCT_FEATURES,
};

describe('useEnterpriseSearchContentNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.uiSettings.get.mockReturnValue(false);
    mockKibanaValues.getNavLinks.mockReturnValue(mockNavLinks);
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    const fullProductAccess: ProductAccess = DEFAULT_PRODUCT_ACCESS;
    setMockValues({
      ...defaultMockValues,
      productAccess: fullProductAccess,
    });

    const { result } = renderHook(() => useEnterpriseSearchNav());

    expect(result.current).toEqual(baseNavItems);
  });

  it('excludes legacy products when the user has no access to them', () => {
    const noProductAccess: ProductAccess = {
      ...DEFAULT_PRODUCT_ACCESS,
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: false,
    };

    setMockValues({
      ...defaultMockValues,
      productAccess: noProductAccess,
    });
    mockKibanaValues.uiSettings.get.mockReturnValue(false);

    const { result } = renderHook(() => useEnterpriseSearchNav());
    const esNav = result.current;
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
      ...defaultMockValues,
      productAccess: workplaceSearchProductAccess,
    });

    const { result } = renderHook(() => useEnterpriseSearchNav());
    const esNav = result.current;
    const legacyESNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(legacyESNav).not.toBeUndefined();
    expect(legacyESNav).toEqual({
      'data-test-subj': 'searchSideNav-EnterpriseSearch',
      id: 'enterpriseSearch',
      items: [
        {
          'data-test-subj': 'searchSideNav-WorkplaceSearch',
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
      ...defaultMockValues,
      productAccess: appSearchProductAccess,
    });

    const { result } = renderHook(() => useEnterpriseSearchNav());
    const esNav = result.current;
    const legacyESNav = esNav?.find((item) => item.id === 'enterpriseSearch');
    expect(legacyESNav).not.toBeUndefined();
    expect(legacyESNav).toEqual({
      'data-test-subj': 'searchSideNav-EnterpriseSearch',
      id: 'enterpriseSearch',
      items: [
        {
          'data-test-subj': 'searchSideNav-AppSearch',
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
    mockKibanaValues.getNavLinks.mockReturnValue(mockNavLinks);
    mockKibanaValues.uiSettings.get.mockReturnValue(true);
    setMockValues(defaultMockValues);
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    const { result } = renderHook(() => useEnterpriseSearchApplicationNav());
    expect(result.current).toEqual(baseNavItems);
  });

  it('returns selected engine sub nav items', () => {
    const engineName = 'my-test-engine';
    const {
      result: { current: navItems },
    } = renderHook(() => useEnterpriseSearchApplicationNav(engineName));
    expect(navItems![0].id).toEqual('home');
    expect(navItems?.slice(1).map((ni) => ni.name)).toEqual([
      'Content',
      'Build',
      'Relevance',
      'Getting started',
      'Enterprise Search',
    ]);
    const searchItem = navItems?.find((ni) => ni.id === 'build');
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
            "iconToString": undefined,
            "id": "enterpriseSearchApplicationsContent",
            "items": undefined,
            "name": <EuiFlexGroup
              alignItems="center"
              justifyContent="spaceBetween"
            >
              Content
            </EuiFlexGroup>,
            "nameToString": "Content",
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
    const {
      result: { current: navItems },
    } = renderHook(() => useEnterpriseSearchApplicationNav(engineName, true));
    expect(navItems![0].id).toEqual('home');
    expect(navItems?.slice(1).map((ni) => ni.name)).toEqual([
      'Content',
      'Build',
      'Relevance',
      'Getting started',
      'Enterprise Search',
    ]);
    const searchItem = navItems?.find((ni) => ni.id === 'build');
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
    const {
      result: { current: navItems },
    } = renderHook(() => useEnterpriseSearchApplicationNav(engineName, false, true));

    // @ts-ignore
    const engineItem = navItems
      .find((ni: EuiSideNavItemType<unknown>) => ni.id === 'build')
      .items.find((ni: EuiSideNavItemType<unknown>) => ni.id === 'searchApplications')
      .items[0].items.find(
        (ni: EuiSideNavItemType<unknown>) => ni.id === 'enterpriseSearchApplicationsContent'
      );

    expect(engineItem).toMatchInlineSnapshot(`
      Object {
        "href": "/app/enterprise_search/applications/search_applications/my-test-engine/content",
        "iconToString": "warning",
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
        "nameToString": "Content",
      }
    `);
  });
});

describe('useEnterpriseSearchAnalyticsNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(defaultMockValues);
    mockKibanaValues.getNavLinks.mockReturnValue(mockNavLinks);
  });

  it('returns basic nav all params are empty', () => {
    const { result } = renderHook(() => useEnterpriseSearchAnalyticsNav());

    expect(result.current).toEqual(baseNavItems);
  });

  it('returns basic nav if only name provided', () => {
    const {
      result: { current: navItems },
    } = renderHook(() => useEnterpriseSearchAnalyticsNav('my-test-collection'));
    expect(navItems).toEqual(
      baseNavItems.map((item) =>
        item.id === 'content'
          ? {
              ...item,
              items: item.items,
            }
          : item
      )
    );
  });

  it('returns nav with sub items when name and paths provided', () => {
    const {
      result: { current: navItems },
    } = renderHook(() =>
      useEnterpriseSearchAnalyticsNav('my-test-collection', {
        explorer: '/explorer-path',
        integration: '/integration-path',
        overview: '/overview-path',
      })
    );
    const applicationsNav = navItems?.find((item) => item.id === 'build');
    expect(applicationsNav).not.toBeUndefined();
    const analyticsNav = applicationsNav?.items?.[2];
    expect(analyticsNav).not.toBeUndefined();
    expect(analyticsNav).toEqual({
      'data-test-subj': 'searchSideNav-BehavioralAnalytics',
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

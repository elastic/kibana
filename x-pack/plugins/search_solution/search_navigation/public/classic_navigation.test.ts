/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { ChromeNavLink } from '@kbn/core-chrome-browser';

import { classicNavigationFactory } from './classic_navigation';
import { ClassicNavItem } from './types';

describe('classicNavigationFactory', function () {
  const mockedNavLinks: Array<Partial<ChromeNavLink>> = [
    {
      id: 'enterpriseSearch',
      url: '/app/enterprise_search/overview',
      title: 'Overview',
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
  ];
  const mockedCoreStart = {
    chrome: {
      navLinks: {
        getAll: () => mockedNavLinks,
      },
    },
  };
  const core = mockedCoreStart as unknown as CoreStart;
  const mockHistory = {
    location: {
      pathname: '/',
    },
    createHref: jest.fn(),
  };
  const history = mockHistory as unknown as ScopedHistory;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory.location.pathname = '/';
    mockHistory.createHref.mockReturnValue('/');
  });

  it('can render top-level items', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'enterpriseSearch',
        },
      },
    ];
    expect(classicNavigationFactory(items, core, history)).toEqual({
      icon: 'logoEnterpriseSearch',
      items: [
        {
          href: '/app/enterprise_search/overview',
          id: 'unit-test',
          isSelected: false,
          name: 'Overview',
          onClick: expect.any(Function),
        },
      ],
      name: 'Elasticsearch',
    });
  });

  it('will set isSelected', () => {
    mockHistory.location.pathname = '/overview';
    mockHistory.createHref.mockReturnValue('/app/enterprise_search/overview');

    const items: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'enterpriseSearch',
        },
      },
    ];

    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'unit-test',
        isSelected: true,
        name: 'Overview',
        onClick: expect.any(Function),
      },
    ]);
  });
  it('can render items with children', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'searchContent',
        name: 'Content',
        items: [
          {
            id: 'searchIndices',
            deepLink: {
              link: 'enterpriseSearchContent:searchIndices',
            },
          },
          {
            id: 'searchConnectors',
            deepLink: {
              link: 'enterpriseSearchContent:connectors',
            },
          },
        ],
      },
    ];

    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        id: 'searchContent',
        items: [
          {
            href: '/app/enterprise_search/content/search_indices',
            id: 'searchIndices',
            isSelected: false,
            name: 'Indices',
            onClick: expect.any(Function),
          },
          {
            href: '/app/enterprise_search/content/connectors',
            id: 'searchConnectors',
            isSelected: false,
            name: 'Connectors',
            onClick: expect.any(Function),
          },
        ],
        name: 'Content',
      },
    ]);
  });
  it('returns name if provided over the deeplink title', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'searchIndices',
        deepLink: {
          link: 'enterpriseSearchContent:searchIndices',
        },
        name: 'Index Management',
      },
    ];
    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        href: '/app/enterprise_search/content/search_indices',
        id: 'searchIndices',
        isSelected: false,
        name: 'Index Management',
        onClick: expect.any(Function),
      },
    ]);
  });
  it('removes item if deeplink not defined', () => {
    const items: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'enterpriseSearch',
        },
      },
      {
        id: 'serverlessElasticsearch',
        deepLink: {
          link: 'serverlessElasticsearch',
        },
      },
    ];

    const solutionNav = classicNavigationFactory(items, core, history);
    expect(solutionNav!.items).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'unit-test',
        isSelected: false,
        name: 'Overview',
        onClick: expect.any(Function),
      },
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../__mocks__/kea_logic';

import type { ChromeNavLink } from '@kbn/core-chrome-browser';
import type { ClassicNavItem } from '@kbn/search-navigation/public';

import '../../__mocks__/react_router';

jest.mock('../react_router_helpers/link_events', () => ({
  letBrowserHandleEvent: jest.fn(),
}));

import { generateSideNavItems } from './classic_nav_helpers';

describe('generateSideNavItems', () => {
  const deepLinksMap = {
    enterpriseSearch: {
      id: 'enterpriseSearch',
      url: '/app/enterprise_search/overview',
      title: 'Overview',
    },
    'enterpriseSearchContent:searchIndices': {
      id: 'enterpriseSearchContent:searchIndices',
      title: 'Indices',
      url: '/app/enterprise_search/content/search_indices',
    },
    'enterpriseSearchContent:connectors': {
      id: 'enterpriseSearchContent:connectors',
      title: 'Connectors',
      url: '/app/enterprise_search/content/connectors',
    },
    'enterpriseSearchContent:webCrawlers': {
      id: 'enterpriseSearchContent:webCrawlers',
      title: 'Web Crawlers',
      url: '/app/enterprise_search/content/crawlers',
    },
  } as unknown as Record<string, ChromeNavLink | undefined>;
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaValues.history.location.pathname = '/';
  });

  it('renders top-level items', () => {
    const classicNavItems: ClassicNavItem[] = [
      {
        id: 'unit-test',
        deepLink: {
          link: 'enterpriseSearch',
        },
      },
    ];

    expect(generateSideNavItems(classicNavItems, deepLinksMap)).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'unit-test',
        isSelected: false,
        name: 'Overview',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('renders items with children', () => {
    const classicNavItems: ClassicNavItem[] = [
      {
        id: 'parent',
        name: 'Parent',
        items: [
          {
            id: 'unit-test',
            deepLink: {
              link: 'enterpriseSearch',
            },
          },
        ],
      },
    ];

    expect(generateSideNavItems(classicNavItems, deepLinksMap)).toEqual([
      {
        id: 'parent',
        items: [
          {
            href: '/app/enterprise_search/overview',
            id: 'unit-test',
            isSelected: false,
            name: 'Overview',
            onClick: expect.any(Function),
          },
        ],
        name: 'Parent',
      },
    ]);
  });

  it('renders classic nav name over deep link title if provided', () => {
    const classicNavItems: ClassicNavItem[] = [
      {
        deepLink: {
          link: 'enterpriseSearch',
        },
        id: 'unit-test',
        name: 'Home',
      },
    ];

    expect(generateSideNavItems(classicNavItems, deepLinksMap)).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'unit-test',
        isSelected: false,
        name: 'Home',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('removes item if deep link is not defined', () => {
    const classicNavItems: ClassicNavItem[] = [
      {
        deepLink: {
          link: 'enterpriseSearch',
        },
        id: 'unit-test',
        name: 'Home',
      },
      {
        deepLink: {
          link: 'enterpriseSearchApplications:playground',
        },
        id: 'unit-test-missing',
      },
    ];

    expect(generateSideNavItems(classicNavItems, deepLinksMap)).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'unit-test',
        isSelected: false,
        name: 'Home',
        onClick: expect.any(Function),
      },
    ]);
  });

  it('adds pre-rendered child items provided', () => {
    const classicNavItems: ClassicNavItem[] = [
      {
        id: 'unit-test',
        name: 'Indices',
      },
    ];
    const subItems = {
      'unit-test': [
        {
          href: '/app/unit-test',
          id: 'child',
          isSelected: true,
          name: 'Index',
          onClick: jest.fn(),
        },
      ],
    };

    expect(generateSideNavItems(classicNavItems, deepLinksMap, subItems)).toEqual([
      {
        id: 'unit-test',
        items: [
          {
            href: '/app/unit-test',
            id: 'child',
            isSelected: true,
            name: 'Index',
            onClick: expect.any(Function),
          },
        ],
        name: 'Indices',
      },
    ]);
  });
});

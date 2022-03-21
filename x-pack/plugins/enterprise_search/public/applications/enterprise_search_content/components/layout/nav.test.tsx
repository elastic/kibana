/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));
jest.mock('../search_index/index_nav', () => ({
  useSearchIndicesNav: () => [],
}));

import { useEnterpriseSearchContentNav } from './';

describe('useEnterpriseSearchContentNav', () => {
  it('returns an array of top-level Enterprise Search nav items', () => {
    expect(useEnterpriseSearchContentNav()).toEqual([
      {
        id: 'es_overview',
        name: 'Overview',
        emphasize: true,
        items: undefined,
        href: '/app/enterprise_search/overview',
      },
      {
        id: 'content',
        name: 'Content',
        emphasize: true,
        href: '/',
        items: [
          {
            href: '/search_indices',
            id: 'search_indices',
            items: [],
            name: 'Search indices',
          },
          {
            href: '/settings',
            id: 'search_indices',
            items: undefined,
            name: 'Settings',
          },
        ],
      },
      {
        id: 'app_search',
        name: 'App Search',
        emphasize: true,
        href: '/app/enterprise_search/app_search',
      },
      {
        id: 'workplace_search',
        name: 'Workplace Search',
        emphasize: true,
        href: '/app/enterprise_search/workplace_search',
      },
    ]);
  });
});

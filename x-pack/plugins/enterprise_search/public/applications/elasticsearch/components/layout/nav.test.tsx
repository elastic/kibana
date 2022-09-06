/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../shared/layout', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));

import { useEnterpriseSearchElasticsearchNav } from '.';

describe('useEnterpriseSearchElasticsearchNav', () => {
  it('returns an array of top-level Enterprise Search nav items', () => {
    expect(useEnterpriseSearchElasticsearchNav()).toEqual([
      {
        id: 'es_overview',
        name: 'Overview',
        emphasize: true,
        isSelected: true,
        href: '/app/enterprise_search/overview',
      },
      {
        id: 'content',
        name: 'Content',
        emphasize: true,
        href: '/app/enterprise_search/content',
      },
      {
        id: 'elasticsearch',
        name: 'Elasticsearch',
        emphasize: true,
        href: '/app/enterprise_search/elasticsearch',
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

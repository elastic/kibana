/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./nav_link_helpers', () => ({
  generateNavLink: jest.fn(({ to, items }) => ({ href: to, items })),
}));

import { setMockValues } from '../../__mocks__/kea_logic';

import { ProductAccess } from '../../../../common/types';

import { useEnterpriseSearchNav } from './nav';

describe('useEnterpriseSearchContentNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an array of top-level Enterprise Search nav items', () => {
    const fullProductAccess: ProductAccess = {
      hasAppSearchAccess: true,
      hasWorkplaceSearchAccess: true,
    };
    setMockValues({ productAccess: fullProductAccess });

    expect(useEnterpriseSearchNav()).toEqual([
      {
        href: '/app/enterprise_search/overview',
        id: 'es_overview',
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
        id: 'search',
        items: [
          {
            href: '/app/enterprise_search/elasticsearch',
            id: 'elasticsearch',
            name: 'Elasticsearch',
          },
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
        name: 'Search',
      },
    ]);
  });

  it('excludes legacy products when the user has no access to them', () => {
    const noProductAccess: ProductAccess = {
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: false,
    };

    setMockValues({ productAccess: noProductAccess });

    expect(useEnterpriseSearchNav()[2]).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
      ],
      name: 'Search',
    });
  });

  it('excludes App Search when the user has no access to it', () => {
    const workplaceSearchProductAccess: ProductAccess = {
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: true,
    };

    setMockValues({ productAccess: workplaceSearchProductAccess });

    expect(useEnterpriseSearchNav()[2]).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
        {
          href: '/app/enterprise_search/workplace_search',
          id: 'workplace_search',
          name: 'Workplace Search',
        },
      ],
      name: 'Search',
    });
  });

  it('excludes Workplace Search when the user has no access to it', () => {
    const appSearchProductAccess: ProductAccess = {
      hasAppSearchAccess: true,
      hasWorkplaceSearchAccess: false,
    };

    setMockValues({ productAccess: appSearchProductAccess });

    expect(useEnterpriseSearchNav()[2]).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
        {
          href: '/app/enterprise_search/app_search',
          id: 'app_search',
          name: 'App Search',
        },
      ],
      name: 'Search',
    });
  });
});

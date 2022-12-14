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

import { ProductAccess } from '../../../../common/types';

import { enableEnginesSection } from '../../../../common/ui_settings_keys';

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
    mockKibanaValues.uiSettings.get.mockReturnValue(true);

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
        id: 'enterpriseSearchEngines',
        name: 'Engines',
        href: '/app/enterprise_search/content/engines',
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
        name: 'Analytics',
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
            href: '/app/enterprise_search/search_experiences',
            id: 'searchExperiences',
            name: 'Search Experiences',
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
    expect(mockKibanaValues.uiSettings.get).toHaveBeenCalledWith(enableEnginesSection, false);
  });

  it('excludes legacy products when the user has no access to them', () => {
    const noProductAccess: ProductAccess = {
      hasAppSearchAccess: false,
      hasWorkplaceSearchAccess: false,
    };

    setMockValues({ productAccess: noProductAccess });
    mockKibanaValues.uiSettings.get.mockReturnValue(false);

    const esNav = useEnterpriseSearchNav();
    const searchNav = esNav.find((item) => item.id === 'search');
    expect(searchNav).not.toBeUndefined();
    expect(searchNav).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
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

    const esNav = useEnterpriseSearchNav();
    const searchNav = esNav.find((item) => item.id === 'search');
    expect(searchNav).not.toBeUndefined();
    expect(searchNav).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
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

    const esNav = useEnterpriseSearchNav();
    const searchNav = esNav.find((item) => item.id === 'search');
    expect(searchNav).not.toBeUndefined();
    expect(searchNav).toEqual({
      id: 'search',
      items: [
        {
          href: '/app/enterprise_search/elasticsearch',
          id: 'elasticsearch',
          name: 'Elasticsearch',
        },
        {
          href: '/app/enterprise_search/search_experiences',
          id: 'searchExperiences',
          name: 'Search Experiences',
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

  it('excludes engines when feature flag is off', () => {
    const fullProductAccess: ProductAccess = {
      hasAppSearchAccess: true,
      hasWorkplaceSearchAccess: true,
    };
    setMockValues({ productAccess: fullProductAccess });

    const esNav = useEnterpriseSearchNav();
    expect(esNav.find((item) => item.id === 'enterpriseSearchEngines')).toBeUndefined();
  });
  it('includes engines when feature flag is on', () => {
    const fullProductAccess: ProductAccess = {
      hasAppSearchAccess: true,
      hasWorkplaceSearchAccess: true,
    };
    setMockValues({ productAccess: fullProductAccess });
    mockKibanaValues.uiSettings.get.mockReturnValue(true);

    const esNav = useEnterpriseSearchNav();
    expect(esNav.find((item) => item.id === 'enterpriseSearchEngines')).not.toBeUndefined();
  });
});

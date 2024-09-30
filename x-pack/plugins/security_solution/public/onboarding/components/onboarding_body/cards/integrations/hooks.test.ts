/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useIntegrationCardList, useTabMetaData } from './hooks';
import { useNavigation } from '../../../../../common/lib/kibana';
import { getFilteredCards } from './utils';

jest.mock('../../../../../common/lib/kibana', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('./utils', () => ({
  getFilteredCards: jest.fn(),
}));

describe('useIntegrationCardList', () => {
  const mockUseNavigation = useNavigation as jest.Mock;
  const mockNavigateTo = jest.fn();
  const mockGetAppUrl = jest.fn();
  const mockIntegrationsList = [
    {
      id: 'security',
      name: 'Security Integration',
      description: 'Integration for security monitoring',
      categories: ['security'],
      icons: [{ src: 'icon_url', type: 'image' }],
      integration: 'security',
      title: 'Security Integration',
      url: '/app/integrations/security',
      version: '1.0.0',
    },
  ];

  beforeEach(() => {
    mockUseNavigation.mockReturnValue({
      navigateTo: mockNavigateTo,
      getAppUrl: mockGetAppUrl,
    });
  });

  it('returns filtered integration cards when customCardNames are not provided', () => {
    const mockFilteredCards = {
      featuredCards: {},
      integrationCards: mockIntegrationsList,
    };
    (getFilteredCards as jest.Mock).mockReturnValue(mockFilteredCards);

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
      })
    );

    expect(getFilteredCards).toHaveBeenCalledWith({
      integrationsList: mockIntegrationsList,
      customCardNames: undefined,
      navigateTo: mockNavigateTo,
      getAppUrl: mockGetAppUrl,
    });
    expect(result.current).toEqual(mockFilteredCards.integrationCards);
  });

  it('returns featured cards when customCardNames are provided', () => {
    const customCardNames = ['Security Integration'];
    const mockFilteredCards = {
      featuredCards: {
        'Security Integration': mockIntegrationsList[0],
      },
      integrationCards: mockIntegrationsList,
    };
    (getFilteredCards as jest.Mock).mockReturnValue(mockFilteredCards);

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        customCardNames,
      })
    );

    expect(getFilteredCards).toHaveBeenCalledWith({
      integrationsList: mockIntegrationsList,
      customCardNames,
      navigateTo: mockNavigateTo,
      getAppUrl: mockGetAppUrl,
    });
    expect(result.current).toEqual([mockFilteredCards.featuredCards['Security Integration']]);
  });
});

describe.each([
  {
    id: 'recommended',
    expected: {
      customCardNames: undefined,
      showSearchTools: false,
      selectedCategory: 'security',
      selectedSubCategory: undefined,
      overflow: 'hidden',
    },
  },
  {
    id: 'network',
    expected: {
      customCardNames: undefined,
      showSearchTools: true,
      selectedCategory: 'security',
      selectedSubCategory: 'network_security',
      overflow: 'scroll',
    },
  },
  {
    id: 'user',
    expected: {
      customCardNames: undefined,
      showSearchTools: true,
      selectedCategory: 'security',
      selectedSubCategory: 'iam',
      overflow: 'scroll',
    },
  },
  {
    id: 'endpoint',
    expected: {
      customCardNames: undefined,
      showSearchTools: true,
      selectedCategory: 'security',
      selectedSubCategory: 'edr_xdr',
      overflow: 'scroll',
    },
  },
  {
    id: 'cloud',
    expected: {
      customCardNames: undefined,
      showSearchTools: true,
      selectedCategory: 'security',
      selectedSubCategory: 'cloudsecurity_cdr',
      overflow: 'scroll',
    },
  },
  {
    id: 'threatIntel',
    expected: {
      customCardNames: undefined,
      showSearchTools: true,
      selectedCategory: 'security',
      selectedSubCategory: 'threat_intel',
      overflow: 'scroll',
    },
  },
  {
    id: 'all',
    expected: {
      customCardNames: undefined,
      showSearchTools: true,
      selectedCategory: '',
      selectedSubCategory: undefined,
      overflow: 'scroll',
    },
  },
])('useTabMetaData', ({ id, expected }) => {
  it(`returns correct metadata for the ${id} tab`, () => {
    const { result } = renderHook(() => useTabMetaData(id));

    expect(result.current).toEqual(expected);
  });
});

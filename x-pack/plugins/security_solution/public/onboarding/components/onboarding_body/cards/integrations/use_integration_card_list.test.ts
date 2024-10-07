/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useIntegrationCardList } from './use_integration_card_list';

jest.mock('../../../../../common/lib/kibana', () => ({
  useNavigation: jest.fn().mockReturnValue({
    navigateTo: jest.fn(),
    getAppUrl: jest.fn(),
  }),
}));

describe('useIntegrationCardList', () => {
  const mockIntegrationsList = [
    {
      id: 'security',
      name: 'Security Integration',
      description: 'Integration for security monitoring',
      categories: ['security'],
      icons: [{ src: 'icon_url', type: 'image' }],
      integration: 'security',
      maxCardHeight: 127,
      onCardClick: expect.any(Function),
      showInstallStatus: true,
      titleLineClamp: 1,
      descriptionLineClamp: 3,
      showInstallationStatus: true,
      title: 'Security Integration',
      url: '/app/integrations/security',
      version: '1.0.0',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns filtered integration cards when customCardNames are not provided', () => {
    const mockFilteredCards = {
      featuredCards: {},
      integrationCards: mockIntegrationsList,
    };

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
      })
    );

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

    const { result } = renderHook(() =>
      useIntegrationCardList({
        integrationsList: mockIntegrationsList,
        customCardNames,
      })
    );

    expect(result.current).toEqual([mockFilteredCards.featuredCards['Security Integration']]);
  });
});

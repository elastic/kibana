/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IntegrationCardItem } from '@kbn/fleet-plugin/public';
import { extractFeaturedCards, getFilteredCards } from './utils'; // Update the path accordingly
import { SECURITY_UI_APP_ID } from '@kbn/security-solution-navigation';
import { INTEGRATION_APP_ID } from './const';
import { APP_UI_ID, ONBOARDING_PATH } from '../../../../../../common/constants';

const maxCardHeight = 127;
const cardTitleLineClamp = 1;
const cardDescriptionLineClamp = 3;
const expectedPath = `?onboardingLink=${encodeURIComponent(
  '/app/security/get_started'
)}&onboardingAppId=securitySolutionUI`;
const expectedUrl = `/app/integrations${expectedPath}`;
const mockIntegrationCardItem = {
  categories: ['security'],
  description: 'Security integration for monitoring.',
  icons: [
    {
      src: 'icon_url',
      type: 'image',
    },
  ],
  id: 'security-integration',
  integration: 'security',
  name: 'Security Integration',
  title: 'Security Integration',
  url: '/app/integrations',
  version: '1.0.0',
};
const mockIntegrationCardItems: IntegrationCardItem[] = [mockIntegrationCardItem];

describe('extractFeaturedCards', () => {
  it('returns an empty object when no featuredCardNames are provided', () => {
    const result = extractFeaturedCards(mockIntegrationCardItems, []);
    expect(result).toEqual({});
  });

  it('extracts featured cards when featuredCardNames are provided', () => {
    const featuredNames = ['Security Integration'];
    const result = extractFeaturedCards(mockIntegrationCardItems, featuredNames);

    expect(result).toEqual({
      'Security Integration': mockIntegrationCardItem,
    });
  });

  it('returns an empty object when no matching featured cards are found', () => {
    const result = extractFeaturedCards(mockIntegrationCardItems, ['NonExistentCard']);
    expect(result).toEqual({});
  });
});

describe('getFilteredCards', () => {
  const mockGetAppUrl = jest
    .fn()
    .mockImplementation(({ appId }) =>
      appId === SECURITY_UI_APP_ID ? '/app/security/get_started' : '/app/integrations'
    );
  const mockNavigateTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns integration cards without featured cards when no custom cards are provided', () => {
    const result = getFilteredCards({
      integrationsList: mockIntegrationCardItems,
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });

    expect(result).toEqual({
      featuredCards: {},
      integrationCards: [
        {
          ...mockIntegrationCardItems[0],
          titleLineClamp: cardTitleLineClamp,
          descriptionLineClamp: cardDescriptionLineClamp,
          maxCardHeight,
          showInstallationStatus: true,
          url: expectedUrl,
          onCardClick: expect.any(Function),
        },
      ],
    });
  });

  it('returns both featured cards and integration cards when custom cards are provided', () => {
    const customCards = ['Security Integration'];
    const result = getFilteredCards({
      integrationsList: mockIntegrationCardItems,
      customCardNames: customCards,
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });

    expect(result).toEqual({
      featuredCards: {
        'Security Integration': {
          ...mockIntegrationCardItems[0],
          titleLineClamp: cardTitleLineClamp,
          descriptionLineClamp: cardDescriptionLineClamp,
          maxCardHeight,
          showInstallationStatus: true,
          url: expectedUrl,
          onCardClick: expect.any(Function),
        },
      },
      integrationCards: [
        {
          ...mockIntegrationCardItems[0],
          titleLineClamp: cardTitleLineClamp,
          descriptionLineClamp: cardDescriptionLineClamp,
          maxCardHeight,
          showInstallationStatus: true,
          url: expectedUrl,
          onCardClick: expect.any(Function),
        },
      ],
    });
  });

  it("should update routes' state when clicking an integration card", () => {
    const result = getFilteredCards({
      integrationsList: mockIntegrationCardItems,
      getAppUrl: mockGetAppUrl,
      navigateTo: mockNavigateTo,
    });

    result.integrationCards[0].onCardClick?.();

    expect(mockNavigateTo).toHaveBeenCalledWith({
      appId: INTEGRATION_APP_ID,
      path: expectedPath,
      state: {
        onCancelNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH }],
        onCancelUrl: '/app/security/get_started',
        onSaveNavigateTo: [APP_UI_ID, { path: ONBOARDING_PATH }],
      },
    });
  });
});

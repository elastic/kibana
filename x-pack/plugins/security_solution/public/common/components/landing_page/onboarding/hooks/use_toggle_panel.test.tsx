/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useTogglePanel } from './use_toggle_panel';

import { SectionId, CardId } from '../types';
import { OnboardingStorage } from '../storage';
import * as mockStorage from '../__mocks__/storage';

jest.mock('../storage', () => ({
  OnboardingStorage: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({ hash: '' }),
}));

jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigateTo: jest.fn().mockReturnValue({ navigateTo: jest.fn() }),
  SecurityPageName: {
    landing: 'landing',
  },
}));

jest.mock('../../../../lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      telemetry: {
        reportOnboardingHubStepOpen: jest.fn(),
        reportOnboardingHubStepFinished: jest.fn(),
      },
    },
  }),
}));

describe('useTogglePanel', () => {
  const onboardingSteps: CardId[] = [
    CardId.createFirstProject,
    CardId.watchTheOverviewVideo,
    CardId.addIntegrations,
    CardId.viewDashboards,
    CardId.enablePrebuiltRules,
    CardId.viewAlerts,
  ];

  const spaceId = 'testSpaceId';

  beforeEach(() => {
    jest.clearAllMocks();

    (OnboardingStorage as jest.Mock).mockImplementation(() => ({
      getAllFinishedCardsFromStorage: mockStorage.mockGetAllFinishedCardsFromStorage,
      resetAllExpandedCardsToStorage: mockStorage.mockResetAllExpandedCardToStorage,
      addFinishedCardToStorage: mockStorage.mockAddFinishedCardToStorage,
      removeFinishedCardFromStorage: mockStorage.mockRemoveFinishedCardFromStorage,
      addExpandedCardToStorage: mockStorage.mockAddExpandedCardToStorage,
      removeExpandedCardFromStorage: mockStorage.mockRemoveExpandedCardFromStorage,
      getAllExpandedCardsFromStorage: mockStorage.mockGetAllExpandedCardsFromStorage,
    }));

    (mockStorage.mockGetAllFinishedCardsFromStorage as jest.Mock).mockReturnValue([
      CardId.createFirstProject,
    ]);
  });

  test('should reset other cards in storage when a card is expanded. (As it allows only one step open at a time)', () => {
    const { result } = renderHook(() => useTogglePanel({ onboardingSteps, spaceId }));

    const { onCardClicked } = result.current;

    act(() => {
      onCardClicked({
        cardId: CardId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        isExpanded: true,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockResetAllExpandedCardToStorage).toHaveBeenCalledTimes(1);
  });

  test('should add the current step to storage when it is expanded', () => {
    const { result } = renderHook(() =>
      useTogglePanel({ onboardingSteps, spaceId: 'testSpaceId' })
    );

    const { onCardClicked } = result.current;

    act(() => {
      onCardClicked({
        cardId: CardId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        isExpanded: true,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockAddExpandedCardToStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockAddExpandedCardToStorage).toHaveBeenCalledWith(
      CardId.watchTheOverviewVideo
    );
  });

  test('should remove the current step from storage when it is collapsed', () => {
    const { result } = renderHook(() => useTogglePanel({ onboardingSteps, spaceId }));

    const { onCardClicked } = result.current;

    act(() => {
      onCardClicked({
        cardId: CardId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        isExpanded: false,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockRemoveExpandedCardFromStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockRemoveExpandedCardFromStorage).toHaveBeenCalledWith(
      CardId.watchTheOverviewVideo
    );
  });

  test('should call addFinishedStepToStorage when toggleTaskCompleteStatus is executed', () => {
    const { result } = renderHook(() => useTogglePanel({ onboardingSteps, spaceId }));

    const { toggleTaskCompleteStatus } = result.current;

    act(() => {
      toggleTaskCompleteStatus({
        cardId: CardId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockAddFinishedCardToStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockAddFinishedCardToStorage).toHaveBeenCalledWith(
      CardId.watchTheOverviewVideo
    );
  });

  test('should call removeFinishedStepToStorage when toggleTaskCompleteStatus is executed with undo equals to true', () => {
    const { result } = renderHook(() => useTogglePanel({ onboardingSteps, spaceId }));

    const { toggleTaskCompleteStatus } = result.current;

    act(() => {
      toggleTaskCompleteStatus({
        cardId: CardId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        undo: true,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockRemoveFinishedCardFromStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockRemoveFinishedCardFromStorage).toHaveBeenCalledWith(
      CardId.watchTheOverviewVideo,
      onboardingSteps
    );
  });
});

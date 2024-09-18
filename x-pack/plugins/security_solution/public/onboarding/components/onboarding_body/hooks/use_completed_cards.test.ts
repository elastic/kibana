/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useCompletedCards } from './use_completed_cards';
import type { OnboardingCardConfig, OnboardingGroupConfig } from '../../../types';
import type { OnboardingCardId } from '../../../constants';

// Mock data
const mockSetCardComplete = jest.fn();

const mockCardsWithCheckComplete = [
  {
    id: 'card-1',
    checkComplete: jest.fn().mockResolvedValue(true),
  },
  {
    id: 'card-2',
    checkComplete: jest.fn().mockResolvedValue(false),
  },
] as unknown as OnboardingCardConfig[];

const mockCardsGroupConfig: OnboardingGroupConfig[] = [
  {
    title: 'Group 1',
    cards: mockCardsWithCheckComplete,
  },
];

describe('useCompletedCards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call checkComplete for all cards when checkAllCardsComplete is called', async () => {
    const { result } = renderHook(() => useCompletedCards(mockCardsGroupConfig));

    // Trigger checkAllCardsComplete function
    await act(async () => {
      result.current.checkAllCardsComplete();
    });

    // Verify checkComplete was called for each card
    expect(mockCardsWithCheckComplete[0].checkComplete).toHaveBeenCalled();
    expect(mockCardsWithCheckComplete[1].checkComplete).toHaveBeenCalled();

    // Ensure setCardComplete was called with the correct values
    expect(mockSetCardComplete).toHaveBeenCalledWith('card-1', true);
    expect(mockSetCardComplete).toHaveBeenCalledWith('card-2', false);
  });

  it('should call checkComplete for a specific card when checkCardComplete is called', async () => {
    const { result } = renderHook(() => useCompletedCards(mockCardsGroupConfig));

    // Trigger checkCardComplete function for card-1
    await act(async () => {
      result.current.checkCardComplete('card-1' as OnboardingCardId);
    });

    // Verify checkComplete was called for card-1
    expect(mockCardsWithCheckComplete[0].checkComplete).toHaveBeenCalled();
    expect(mockSetCardComplete).toHaveBeenCalledWith('card-1', true);

    // Trigger checkCardComplete function for card-2
    await act(async () => {
      result.current.checkCardComplete('card-2' as OnboardingCardId);
    });

    // Verify checkComplete was called for card-2
    expect(mockCardsWithCheckComplete[1].checkComplete).toHaveBeenCalled();
    expect(mockSetCardComplete).toHaveBeenCalledWith('card-2', false);
  });

  it('should not call setCardComplete if checkComplete is not defined', async () => {
    // Modify one card to not have checkComplete
    const mockCardsWithoutCheckComplete = [
      {
        id: 'card-3',
        checkComplete: undefined,
      },
    ] as unknown as OnboardingCardConfig[];

    const mockCardsGroupConfigWithoutCheckComplete: OnboardingGroupConfig[] = [
      {
        title: 'Group 2',
        cards: mockCardsWithoutCheckComplete,
      },
    ];

    const { result } = renderHook(() =>
      useCompletedCards(mockCardsGroupConfigWithoutCheckComplete)
    );

    // Trigger checkCardComplete for card-3
    await act(async () => {
      result.current.checkCardComplete('card-3' as OnboardingCardId);
    });

    // Ensure setCardComplete was not called since checkComplete is not defined
    expect(mockSetCardComplete).not.toHaveBeenCalled();
  });
});

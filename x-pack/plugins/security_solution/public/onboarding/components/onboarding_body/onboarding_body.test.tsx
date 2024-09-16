/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingBody } from './onboarding_body';
import { useBodyConfig } from './hooks/use_body_config';
import { useOnboardingContext } from '../onboarding_context';
import { useExpandedCard } from './hooks/use_expanded_card';
import { useCompletedCards } from './hooks/use_completed_cards';
import { useCheckCompleteCards } from './hooks/use_check_complete_cards';

// Mocking hooks
jest.mock('./hooks/use_body_config');
jest.mock('../onboarding_context');
jest.mock('./hooks/use_expanded_card');
jest.mock('./hooks/use_completed_cards');
jest.mock('./hooks/use_check_complete_cards');

const mockBodyConfig = [
  {
    title: 'Group 1',
    cards: [
      {
        id: 'card-1',
        title: 'Card 1',
        icon: 'icon1',
        Component: () => <div>{'Card 1 Content'}</div>,
      },
    ],
  },
];

const mockUseBodyConfig = useBodyConfig as jest.Mock;
const mockUseOnboardingContext = useOnboardingContext as jest.Mock;
const mockUseExpandedCard = useExpandedCard as jest.Mock;
const mockUseCompletedCards = useCompletedCards as jest.Mock;
const mockUseCheckCompleteCards = useCheckCompleteCards as jest.Mock;

// Mock the hooks to return desired test data
mockUseOnboardingContext.mockReturnValue({ spaceId: 'space-1' });
mockUseBodyConfig.mockReturnValue(mockBodyConfig);
mockUseExpandedCard.mockReturnValue({ expandedCardId: null, setExpandedCardId: jest.fn() });
mockUseCompletedCards.mockReturnValue({
  isCardComplete: jest.fn(() => false),
  setCardComplete: jest.fn(),
});
mockUseCheckCompleteCards.mockReturnValue({
  checkAllCardsComplete: jest.fn(),
  checkCardComplete: jest.fn(),
});

describe('OnboardingBody Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the OnboardingBody component with the correct content', async () => {
    render(<OnboardingBody />);

    // Check that the group title is rendered
    expect(screen.getByText('Group 1')).toBeInTheDocument();

    // Check that the card title and content are rendered
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Card 1 Content')).toBeInTheDocument();
  });

  it('calls the necessary functions when expanding a card', async () => {
    const mockSetExpandedCardId = jest.fn();
    const mockCheckCardComplete = jest.fn();

    // Update the mock with new behavior
    mockUseExpandedCard.mockReturnValueOnce({
      expandedCardId: null,
      setExpandedCardId: mockSetExpandedCardId,
    });
    mockUseCheckCompleteCards.mockReturnValueOnce({
      checkAllCardsComplete: jest.fn(),
      checkCardComplete: mockCheckCardComplete,
    });

    render(<OnboardingBody />);

    // Click the card to expand it
    fireEvent.click(screen.getByText('Card 1'));

    // Check that the setExpandedCardId function was called with the correct card id
    expect(mockSetExpandedCardId).toHaveBeenCalledWith('card-1');

    // Check that the checkCardComplete function was called for the expanded card
    await waitFor(() => {
      expect(mockCheckCardComplete).toHaveBeenCalledWith('card-1');
    });
  });

  it('auto-checks all cards when the component mounts', () => {
    const mockCheckAllCardsComplete = jest.fn();

    mockUseCheckCompleteCards.mockReturnValueOnce({
      checkAllCardsComplete: mockCheckAllCardsComplete,
      checkCardComplete: jest.fn(),
    });

    render(<OnboardingBody />);

    // Ensure that the checkAllCardsComplete is called on component mount
    expect(mockCheckAllCardsComplete).toHaveBeenCalled();
  });
});

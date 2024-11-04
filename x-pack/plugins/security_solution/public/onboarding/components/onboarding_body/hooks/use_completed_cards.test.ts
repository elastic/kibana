/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, type RenderHookResult } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useCompletedCards } from './use_completed_cards';
import type { OnboardingGroupConfig } from '../../../types';
import type { OnboardingCardId } from '../../../constants';
import { mockReportCardComplete } from '../../__mocks__/onboarding_context_mocks';
import { useKibana } from '../../../../common/lib/kibana';

const defaultStoredCompletedCardIds: OnboardingCardId[] = [];
const mockSetStoredCompletedCardIds = jest.fn();
const mockUseKibana = useKibana as jest.Mock;
const mockUseStoredCompletedCardIds = jest.fn(() => [
  defaultStoredCompletedCardIds,
  mockSetStoredCompletedCardIds,
]);
jest.mock('../../../hooks/use_stored_state', () => ({
  ...jest.requireActual('../../../hooks/use_stored_state'),
  useStoredCompletedCardIds: () => mockUseStoredCompletedCardIds(),
}));

jest.mock('../../onboarding_context');
jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: jest.fn().mockReturnValue({
      services: { notifications: { toasts: { addError: jest.fn() } } },
    }),
  };
});

const cardComplete = {
  id: 'card-completed' as OnboardingCardId,
  title: 'card completed',
  checkComplete: jest.fn().mockResolvedValue(true),
};
const cardComplete2 = {
  id: 'card-completed-2' as OnboardingCardId,
  title: 'card completed 2',
  checkComplete: jest.fn().mockResolvedValue({ isComplete: true }),
};
const cardIncomplete = {
  id: 'card-incomplete' as OnboardingCardId,
  title: 'card incomplete',
  checkComplete: jest.fn().mockResolvedValue(false),
};
const cardBadgeText = {
  id: 'card-badge-text' as OnboardingCardId,
  title: 'card badge text',
  checkComplete: jest
    .fn()
    .mockResolvedValue({ isComplete: true, completeBadgeText: 'custom badge text' }),
};
const cardIncompleteAdditionalBadges = {
  id: 'card-additional-badges' as OnboardingCardId,
  title: 'card badge text',
  checkComplete: jest.fn().mockResolvedValue({
    isComplete: false,
    additionalBadges: ['additional badge'],
  }),
};
const cardMetadata = {
  id: 'card-metadata' as OnboardingCardId,
  title: 'card metadata',
  checkComplete: jest
    .fn()
    .mockResolvedValue({ isComplete: true, metadata: { custom: 'metadata' } }),
};
const mockAddError = jest.fn();
const mockError = new Error('Failed to check complete');
const cardCheckCompleteFailed = {
  id: 'card-failed' as OnboardingCardId,
  title: 'card failed',
  checkComplete: jest.fn().mockRejectedValue(mockError),
};

const mockCardsGroupConfig = [
  {
    title: 'Group 1',
    cards: [cardComplete, cardComplete2, cardIncomplete],
  },
  {
    title: 'Group 2',
    cards: [cardBadgeText, cardIncompleteAdditionalBadges, cardMetadata],
  },
] as unknown as OnboardingGroupConfig[];

const mockFailureCardsGroupConfig = [
  {
    title: 'Group 1',
    cards: [cardCheckCompleteFailed],
  },
] as unknown as OnboardingGroupConfig[];

describe('useCompletedCards Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when checkComplete functions are rejected', () => {
    let renderResult: RenderHookResult<
      OnboardingGroupConfig[],
      ReturnType<typeof useCompletedCards>
    >;
    beforeEach(async () => {
      mockUseKibana.mockReturnValue({
        services: { notifications: { toasts: { addError: mockAddError } } },
      });
      renderResult = renderHook(useCompletedCards, { initialProps: mockFailureCardsGroupConfig });
      await act(async () => {
        await waitFor(() => {
          expect(mockSetStoredCompletedCardIds).toHaveBeenCalledTimes(0); // number of completed cards
        });
      });
    });

    describe('when a the auto check is called', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await act(async () => {
          renderResult.result.current.checkCardComplete(cardCheckCompleteFailed.id);
        });
      });

      it('should not set the completed card ids', async () => {
        expect(mockSetStoredCompletedCardIds).not.toHaveBeenCalled();
      });

      it('should return the correct completed state', () => {
        expect(renderResult.result.current.isCardComplete(cardCheckCompleteFailed.id)).toEqual(
          false
        );
      });

      it('should show an error toast', () => {
        expect(mockAddError).toHaveBeenCalledWith(mockError, {
          title: cardCheckCompleteFailed.title,
        });
      });

      it('should not report the completed card', async () => {
        expect(mockReportCardComplete).not.toHaveBeenCalled();
      });
    });
  });

  describe('when checkComplete functions are resolved', () => {
    let renderResult: RenderHookResult<
      OnboardingGroupConfig[],
      ReturnType<typeof useCompletedCards>
    >;
    beforeEach(async () => {
      renderResult = renderHook(useCompletedCards, { initialProps: mockCardsGroupConfig });
      await act(async () => {
        await waitFor(() => {
          expect(mockSetStoredCompletedCardIds).toHaveBeenCalledTimes(4); // number of completed cards
        });
      });
    });

    it('should set the correct completed card ids', async () => {
      expect(mockSetStoredCompletedCardIds).toHaveBeenCalledWith([
        cardComplete.id,
        cardComplete2.id,
        cardBadgeText.id,
        cardMetadata.id,
      ]);
      expect(mockSetStoredCompletedCardIds).not.toHaveBeenCalledWith(
        expect.arrayContaining([cardIncomplete.id])
      );
      expect(mockSetStoredCompletedCardIds).not.toHaveBeenCalledWith(
        expect.arrayContaining([cardIncompleteAdditionalBadges.id])
      );
    });

    it('should report completed card ids', () => {
      expect(mockReportCardComplete).toHaveBeenCalledTimes(4);
      expect(mockReportCardComplete).toHaveBeenCalledWith(cardComplete.id, { auto: true });
      expect(mockReportCardComplete).toHaveBeenCalledWith(cardComplete2.id, { auto: true });
      expect(mockReportCardComplete).toHaveBeenCalledWith(cardBadgeText.id, { auto: true });
      expect(mockReportCardComplete).toHaveBeenCalledWith(cardMetadata.id, { auto: true });
    });

    it('should return the correct completed state', () => {
      expect(renderResult.result.current.isCardComplete(cardComplete.id)).toEqual(true);
      expect(renderResult.result.current.isCardComplete(cardComplete2.id)).toEqual(true);
      expect(renderResult.result.current.isCardComplete(cardIncomplete.id)).toEqual(false);
      expect(renderResult.result.current.isCardComplete(cardBadgeText.id)).toEqual(true);
      expect(renderResult.result.current.isCardComplete(cardMetadata.id)).toEqual(true);
      expect(renderResult.result.current.isCardComplete(cardIncompleteAdditionalBadges.id)).toEqual(
        false
      );
    });

    describe('when a card is marked as complete', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        act(() => {
          renderResult.result.current.setCardComplete(cardIncomplete.id, true);
        });
      });

      it('should set the correct completed card ids', async () => {
        expect(mockSetStoredCompletedCardIds).toHaveBeenCalledTimes(1);
        expect(mockSetStoredCompletedCardIds).toHaveBeenCalledWith([
          cardComplete.id,
          cardComplete2.id,
          cardBadgeText.id,
          cardMetadata.id,
          cardIncomplete.id,
        ]);
      });

      it('should return the correct completed state', () => {
        expect(renderResult.result.current.isCardComplete(cardIncomplete.id)).toEqual(true);
      });

      it('should report the completed card', async () => {
        expect(mockReportCardComplete).toHaveBeenCalledTimes(1);
        expect(mockReportCardComplete).toHaveBeenCalledWith(cardIncomplete.id, undefined);
      });
    });

    describe('when a card is marked as incomplete', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        act(() => {
          renderResult.result.current.setCardComplete(cardComplete.id, false);
        });
      });

      it('should set the correct completed card ids', async () => {
        expect(mockSetStoredCompletedCardIds).toHaveBeenCalledTimes(1);
        expect(mockSetStoredCompletedCardIds).toHaveBeenCalledWith([
          cardComplete2.id,
          cardBadgeText.id,
          cardMetadata.id,
        ]);
      });

      it('should return the correct completed state', () => {
        expect(renderResult.result.current.isCardComplete(cardComplete.id)).toEqual(false);
      });

      it('should not report the completed card', async () => {
        expect(mockReportCardComplete).not.toHaveBeenCalled();
      });
    });

    describe('when a the auto check is called', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        cardIncomplete.checkComplete.mockResolvedValueOnce(true);
        await act(async () => {
          renderResult.result.current.checkCardComplete(cardIncomplete.id);
          await waitFor(() => {
            expect(mockSetStoredCompletedCardIds).toHaveBeenCalledTimes(1);
          });
        });
      });

      it('should set the correct completed card ids', async () => {
        expect(mockSetStoredCompletedCardIds).toHaveBeenCalledWith([
          cardComplete.id,
          cardComplete2.id,
          cardBadgeText.id,
          cardMetadata.id,
          cardIncomplete.id,
        ]);
      });

      it('should return the correct completed state', () => {
        expect(renderResult.result.current.isCardComplete(cardIncomplete.id)).toEqual(true);
      });

      it('should report the completed card', async () => {
        expect(mockReportCardComplete).toHaveBeenCalledTimes(1);
        expect(mockReportCardComplete).toHaveBeenCalledWith(cardIncomplete.id, { auto: true });
      });
    });
  });
});

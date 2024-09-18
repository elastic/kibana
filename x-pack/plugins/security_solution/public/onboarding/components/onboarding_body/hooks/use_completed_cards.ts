/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useStoredCompletedCardIds } from '../../../hooks/use_stored_state';
import type { OnboardingCardId } from '../../../constants';
import type {
  CheckCompleteResult,
  CheckCompleteResponse,
  OnboardingCardConfig,
  OnboardingGroupConfig,
} from '../../../types';
import { useOnboardingContext } from '../../onboarding_context';

export type IsCardComplete = (cardId: OnboardingCardId) => boolean;
export type SetCardComplete = (
  cardId: OnboardingCardId,
  complete: boolean,
  options?: { auto?: boolean }
) => void;
export type GetCardCheckCompleteResult = (
  cardId: OnboardingCardId
) => CheckCompleteResult | undefined;

export type CardCheckCompleteResult = Partial<Record<OnboardingCardId, CheckCompleteResult>>;

/**
 * This hook implements the logic for tracking which onboarding cards have been completed using Local Storage.
 */
export const useCompletedCards = (cardsGroupConfig: OnboardingGroupConfig[]) => {
  const { spaceId, reportCardComplete } = useOnboardingContext();
  const [completeCardIds, setCompleteCardIds] = useStoredCompletedCardIds(spaceId);
  const [cardCheckCompleteResult, setCardsCompleteResult] = useState<CardCheckCompleteResult>({});

  // Exported: checks if a specific card has been completed
  const isCardComplete = useCallback<IsCardComplete>(
    (cardId) => completeCardIds.includes(cardId),
    [completeCardIds]
  );

  // Exported: sets the completion status for a specific card
  const setCardComplete = useCallback<SetCardComplete>(
    (cardId, complete, options) => {
      const isCurrentlyComplete = completeCardIds.includes(cardId);
      if (complete && !isCurrentlyComplete) {
        reportCardComplete(cardId, options);
        setCompleteCardIds([...completeCardIds, cardId]);
      } else if (!complete && isCurrentlyComplete) {
        setCompleteCardIds(completeCardIds.filter((id) => id !== cardId));
      }
    },
    [completeCardIds, setCompleteCardIds, reportCardComplete]
  );

  // Exported: gets the checkCompleteResult for a specific card
  const getCardCheckCompleteResult = useCallback<GetCardCheckCompleteResult>(
    (cardId) => cardCheckCompleteResult[cardId],
    [cardCheckCompleteResult]
  );

  // Internal: sets the checkCompleteResult for a specific card
  const setCardCheckCompleteResult = useCallback(
    (cardId: OnboardingCardId, options: CheckCompleteResult) => {
      setCardsCompleteResult((currentCardCheckCompleteResult = {}) => ({
        ...currentCardCheckCompleteResult,
        [cardId]: options,
      }));
    },
    [setCardsCompleteResult]
  );

  // Internal: stores all cards that have a checkComplete function in a flat array
  const cardsWithCheckComplete = useMemo(
    () =>
      cardsGroupConfig.reduce<OnboardingCardConfig[]>((acc, group) => {
        acc.push(...group.cards.filter((card) => card.checkComplete));
        return acc;
      }, []),
    [cardsGroupConfig]
  );

  // Internal: sets the result of a checkComplete function
  const processCardCheckCompleteResult = useCallback(
    (cardId: OnboardingCardId, checkCompleteResult: CheckCompleteResponse) => {
      if (typeof checkCompleteResult === 'boolean') {
        setCardComplete(cardId, checkCompleteResult, { auto: true });
      } else {
        const { isComplete, ...options } = checkCompleteResult;
        setCardComplete(cardId, isComplete, { auto: true });
        setCardCheckCompleteResult(cardId, options);
      }
    },
    [setCardComplete, setCardCheckCompleteResult]
  );

  // Exported: runs the check for all cards the have a checkComplete function
  const checkAllCardsComplete = useCallback(() => {
    cardsWithCheckComplete.map((card) =>
      card.checkComplete?.().then((checkCompleteResult) => {
        processCardCheckCompleteResult(card.id, checkCompleteResult);
      })
    );
  }, [cardsWithCheckComplete, processCardCheckCompleteResult]);

  // Exported: runs the check for a specific card
  const checkCardComplete = useCallback(
    (cardId: OnboardingCardId) => {
      const cardConfig = cardsWithCheckComplete.find(({ id }) => id === cardId);

      if (cardConfig) {
        cardConfig.checkComplete?.().then((checkCompleteResult) => {
          processCardCheckCompleteResult(cardId, checkCompleteResult);
        });
      }
    },
    [cardsWithCheckComplete, processCardCheckCompleteResult]
  );

  return {
    isCardComplete,
    setCardComplete,
    getCardCheckCompleteResult,
    checkAllCardsComplete,
    checkCardComplete,
  };
};

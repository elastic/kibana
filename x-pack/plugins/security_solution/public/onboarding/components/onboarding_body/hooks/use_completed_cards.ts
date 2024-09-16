/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useStoredCompletedCardIds } from '../../../hooks/use_stored_state';
import type { OnboardingCardId } from '../../../constants';

/**
 * This hook implements the logic for tracking which onboarding cards have been completed using Local Storage.
 */
export const useCompletedCards = (spaceId: string) => {
  const [completeCardIds, setCompleteCardIds] = useStoredCompletedCardIds(spaceId);

  const isCardComplete = useCallback(
    (cardId: OnboardingCardId) => completeCardIds.includes(cardId),
    [completeCardIds]
  );

  const setCardComplete = useCallback(
    (cardId: OnboardingCardId, complete: boolean) => {
      if (complete) {
        setCompleteCardIds((currentCompleteCards = []) => [
          ...new Set([...currentCompleteCards, cardId]),
        ]);
      } else {
        setCompleteCardIds((currentCompleteCards = []) =>
          currentCompleteCards.filter((id) => id !== cardId)
        );
      }
    },
    [setCompleteCardIds]
  );

  return { isCardComplete, setCardComplete };
};

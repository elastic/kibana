/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { OnboardingCardId } from '../../../constants';
import type { OnboardingCardConfig, OnboardingGroupConfig } from '../../../types';

/**
 * Hook that implements the functions to call the `checkComplete` function for the cards that have it defined in the config
 **/
export const useCheckCompleteCards = (
  cardsGroupConfig: OnboardingGroupConfig[],
  setCardComplete: (cardId: OnboardingCardId, complete: boolean) => void
) => {
  // Stores all cards that have a checkComplete function in a flat array
  const cardsWithCheckComplete = useMemo(
    () =>
      cardsGroupConfig.reduce<OnboardingCardConfig[]>((acc, group) => {
        acc.push(...group.cards.filter((card) => card.checkComplete));
        return acc;
      }, []),
    [cardsGroupConfig]
  );

  // Exported function to run the check for all cards the have a checkComplete function
  const checkAllCardsComplete = useCallback(() => {
    cardsWithCheckComplete.map((card) =>
      card.checkComplete?.().then((isComplete) => {
        setCardComplete(card.id, isComplete);
      })
    );
  }, [cardsWithCheckComplete, setCardComplete]);

  // Exported function to run the check for a specific card
  const checkCardComplete = useCallback(
    (cardId: OnboardingCardId) => {
      const cardConfig = cardsWithCheckComplete.find(({ id }) => id === cardId);

      if (cardConfig) {
        cardConfig.checkComplete?.().then((isComplete) => {
          setCardComplete(cardId, isComplete);
        });
      }
    },
    [cardsWithCheckComplete, setCardComplete]
  );

  return { checkAllCardsComplete, checkCardComplete };
};

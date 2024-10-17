/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import { useStoredCompletedCardIds } from '../../../hooks/use_stored_state';
import type { OnboardingCardId } from '../../../constants';
import type {
  CheckCompleteResult,
  CheckCompleteResponse,
  OnboardingGroupConfig,
  OnboardingCardConfig,
} from '../../../types';
import { useOnboardingContext } from '../../onboarding_context';

export type IsCardCheckFailed = (cardId: OnboardingCardId) => boolean;
export type IsCardComplete = (cardId: OnboardingCardId) => boolean;
export type SetCardComplete = (
  cardId: OnboardingCardId,
  completed: boolean,
  options?: { auto?: boolean }
) => void;
export type GetCardCheckCompleteResult = (
  cardId: OnboardingCardId
) => CheckCompleteResult | undefined;

export type CardCheckCompleteResult = Partial<Record<OnboardingCardId, CheckCompleteResult>>;

const getErrorMessage = (title: string) =>
  i18n.translate('xpack.securitySolution.onboarding.checkCompleteError', {
    defaultMessage: 'Failed to retrieve the completion status for {title}',
    values: { title },
  });

/**
 * This hook implements the logic for tracking which onboarding cards have been completed using Local Storage.
 */
export const useCompletedCards = (cardsGroupConfig: OnboardingGroupConfig[]) => {
  const { spaceId, reportCardComplete } = useOnboardingContext();
  const services = useKibana().services;
  const autoCheckCompletedRef = useRef<boolean>(false);

  // Use stored state to keep localStorage in sync, and a local state to avoid unnecessary re-renders.
  const [storedCompleteCardIds, setStoredCompleteCardIds] = useStoredCompletedCardIds(spaceId);
  const [completeCardIds, setCompleteCardIds] = useState<OnboardingCardId[]>(storedCompleteCardIds);
  // Local state to store the checkCompleteResult for each card
  const [cardCheckCompleteResult, setCardsCompleteResult] = useState<CardCheckCompleteResult>({});
  const toasts = useToasts();

  const isCardComplete = useCallback<IsCardComplete>(
    (cardId) => completeCardIds.includes(cardId),
    [completeCardIds]
  );

  const setCardComplete = useCallback<SetCardComplete>(
    (cardId, completed, options) => {
      // This state update has side effects, using a callback
      setCompleteCardIds((currentCompleteCards) => {
        const isCurrentlyComplete = currentCompleteCards.includes(cardId);
        if (completed && !isCurrentlyComplete) {
          const newCompleteCardIds = [...currentCompleteCards, cardId];
          reportCardComplete(cardId, options);
          setStoredCompleteCardIds(newCompleteCardIds); // Keep the stored state in sync with the local state
          return newCompleteCardIds;
        } else if (!completed && isCurrentlyComplete) {
          const newCompleteCardIds = currentCompleteCards.filter((id) => id !== cardId);
          setStoredCompleteCardIds(newCompleteCardIds); // Keep the stored state in sync with the local state
          return newCompleteCardIds;
        }
        return currentCompleteCards; // No change
      });
    },
    [reportCardComplete, setStoredCompleteCardIds] // static dependencies, this function needs to be stable
  );

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
    []
  );

  // Internal: stores all cards that have a checkComplete function in a flat array
  const cardsWithAutoCheck = useMemo(
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
        const { isComplete, ...result } = checkCompleteResult;
        setCardComplete(cardId, isComplete, { auto: true });
        setCardCheckCompleteResult(cardId, result);
      }
    },
    [setCardComplete, setCardCheckCompleteResult]
  );

  const displayErrorToast = useCallback(
    (cardTitle: string, error: Error) => {
      toasts.addError(error, {
        title: getErrorMessage(cardTitle),
      });
    },
    [toasts]
  );

  const checkCardComplete = useCallback(
    (cardId: OnboardingCardId) => {
      const cardConfig = cardsWithAutoCheck.find(({ id }) => id === cardId);

      if (cardConfig) {
        cardConfig
          .checkComplete?.(services)
          .catch((e: Error) => {
            displayErrorToast(cardConfig.title, e);
            return {
              isComplete: false,
              checkCompleteError: e,
            };
          })
          .then((checkCompleteResult) => {
            processCardCheckCompleteResult(cardId, checkCompleteResult);
          });
      }
    },
    [cardsWithAutoCheck, displayErrorToast, processCardCheckCompleteResult, services]
  );

  useEffect(() => {
    // Initial auto-check for all cards, it should run only once, after cardsGroupConfig is properly populated
    if (cardsWithAutoCheck.length === 0 || autoCheckCompletedRef.current) {
      return;
    }
    autoCheckCompletedRef.current = true;
    cardsWithAutoCheck.map((card) =>
      card
        .checkComplete?.(services)
        .catch((e: Error) => {
          displayErrorToast(card.title, e);
          return {
            isComplete: false,
            checkCompleteError: e,
          };
        })
        .then((checkCompleteResult) => {
          processCardCheckCompleteResult(card.id, checkCompleteResult);
        })
    );
  }, [cardsWithAutoCheck, displayErrorToast, processCardCheckCompleteResult, services, toasts]);

  return {
    isCardComplete,
    setCardComplete,
    getCardCheckCompleteResult,
    checkCardComplete,
  };
};

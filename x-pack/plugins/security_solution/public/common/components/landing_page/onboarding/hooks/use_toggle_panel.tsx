/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigateTo } from '@kbn/security-solution-navigation';

import { SecurityPageName } from '../../../../../../common';

import { OnboardingStorage } from '../storage';
import { getActiveSectionsInitialStates, reducer } from '../reducer';
import type {
  Card,
  ExpandedCards,
  ToggleTaskCompleteStatus,
  CardId,
  OnCardClicked,
} from '../types';
import { OnboardingActions } from '../types';
import { findCardSectionByCardId } from '../helpers';
import { useKibana } from '../../../../lib/kibana';

const syncExpandedCardStepsToStorageFromURL = (
  onboardingStorage: OnboardingStorage,
  maybeStepId: string
) => {
  const { matchedCard } = findCardSectionByCardId(maybeStepId);

  if (matchedCard) {
    onboardingStorage.resetAllExpandedCardsToStorage();
    onboardingStorage.addExpandedCardToStorage(matchedCard.id);
  }
};

const syncExpandedCardStepsFromStorageToURL = (
  expandedCardIds: ExpandedCards,
  callback: ({ matchedCard }: { matchedCard: Card | null }) => void
) => {
  if (expandedCardIds) {
    const { matchedCard } = findCardSectionByCardId([...expandedCardIds][0]);

    callback?.({ matchedCard });
  }
};

export const useTogglePanel = ({
  onboardingSteps,
  spaceId,
}: {
  onboardingSteps: CardId[];
  spaceId: string | undefined;
}) => {
  const { telemetry } = useKibana().services;
  const { navigateTo } = useNavigateTo();

  const { hash: detailName } = useLocation();
  const stepIdFromHash = detailName.split('#')[1];

  const onboardingStorage = useMemo(() => new OnboardingStorage(spaceId), [spaceId]);
  const {
    getAllFinishedCardsFromStorage,
    addExpandedCardToStorage,
    addFinishedCardToStorage,
    removeFinishedCardFromStorage,
    removeExpandedCardFromStorage,
    resetAllExpandedCardsToStorage,
    getAllExpandedCardsFromStorage,
  } = onboardingStorage;

  const finishedCardIdsInitialStates: Set<CardId> = useMemo(
    () => new Set(getAllFinishedCardsFromStorage()),
    [getAllFinishedCardsFromStorage]
  );

  const expandedCardsInitialStates: ExpandedCards = useMemo(() => {
    if (stepIdFromHash) {
      syncExpandedCardStepsToStorageFromURL(onboardingStorage, stepIdFromHash);
    }

    const expandedCardIds = getAllExpandedCardsFromStorage();
    return new Set(expandedCardIds);
  }, [stepIdFromHash, getAllExpandedCardsFromStorage, onboardingStorage]);

  const activeSectionsInitialStates = useMemo(
    () =>
      getActiveSectionsInitialStates({
        onboardingSteps,
      }),
    [onboardingSteps]
  );

  const [state, dispatch] = useReducer(reducer, {
    activeSections: activeSectionsInitialStates,
    expandedCardIds: expandedCardsInitialStates,
    finishedCardIds: finishedCardIdsInitialStates,
    onboardingSteps,
  });

  const onCardClicked: OnCardClicked = useCallback(
    ({ cardId, isExpanded, trigger }) => {
      dispatch({
        type: OnboardingActions.ToggleExpandedCard,
        payload: { cardId, isCardExpanded: isExpanded },
      });

      if (isExpanded) {
        // It allows Only One step open at a time
        resetAllExpandedCardsToStorage();
        addExpandedCardToStorage(cardId);
        telemetry.reportOnboardingHubStepOpen({
          cardId,
          trigger,
        });
      } else {
        removeExpandedCardFromStorage(cardId);
      }
    },
    [
      addExpandedCardToStorage,
      removeExpandedCardFromStorage,
      resetAllExpandedCardsToStorage,
      telemetry,
    ]
  );

  const toggleTaskCompleteStatus: ToggleTaskCompleteStatus = useCallback(
    ({ stepLinkId, cardId, undo, trigger }) => {
      dispatch({
        type: undo ? OnboardingActions.RemoveFinishedCard : OnboardingActions.AddFinishedCard,
        payload: { cardId },
      });
      if (undo) {
        removeFinishedCardFromStorage(cardId, state.onboardingSteps);
      } else {
        addFinishedCardToStorage(cardId);
        telemetry.reportOnboardingHubStepFinished({ cardId, stepLinkId, trigger });
      }
    },
    [addFinishedCardToStorage, removeFinishedCardFromStorage, state.onboardingSteps, telemetry]
  );

  useEffect(() => {
    /** Handle landing on the page without hash
     ** e.g.: https://localhost:5601/app/security/get_started
     ** If there is no expanded card step in storage, do nothing.
     ** If there is expanded card step in storage, sync it to the url.
     **/
    if (!stepIdFromHash) {
      // If all steps are collapsed, do nothing
      if (Object.values(state.expandedCardIds).every((c) => !c.isExpanded)) {
        return;
      }

      syncExpandedCardStepsFromStorageToURL(
        expandedCardsInitialStates,
        ({ matchedCard }: { matchedCard: Card | null }) => {
          if (!matchedCard) return;
          navigateTo({
            deepLinkId: SecurityPageName.landing,
            path: `#${matchedCard.id}`,
          });
        }
      );
    }
  }, [expandedCardsInitialStates, navigateTo, state.expandedCardIds, stepIdFromHash]);

  useEffect(() => {
    /** Handle hash change and expand the target step.
     ** e.g.: https://localhost:5601/app/security/get_started#create_your_first_project
     **/
    if (stepIdFromHash) {
      const { matchedCard, matchedSection } = findCardSectionByCardId(stepIdFromHash);
      if (matchedCard && matchedSection) {
        // If the step is already expanded, do nothing
        if (state.expandedCardIds.has(matchedCard.id)) {
          return;
        }

        // The step is opened by navigation instead of clicking directly on the step. e.g.: clicking a stepLink
        // Toggle step and sync the expanded card step to storage & reducer
        onCardClicked({
          cardId: matchedCard.id,
          sectionId: matchedSection.id,
          isExpanded: true,
          trigger: 'navigation',
        });

        navigateTo({
          deepLinkId: SecurityPageName.landing,
          path: `#${matchedCard.id}`,
        });
      }
    }
  }, [navigateTo, onCardClicked, state.expandedCardIds, stepIdFromHash]);

  return {
    state,
    onCardClicked,
    toggleTaskCompleteStatus,
  };
};

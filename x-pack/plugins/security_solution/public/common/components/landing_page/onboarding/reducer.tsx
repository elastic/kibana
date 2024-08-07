/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupActiveSections, updateActiveSections } from './helpers';
import type { ReducerActions } from './types';
import { type CardId, type TogglePanelReducer, OnboardingActions } from './types';

export const reducer = (state: TogglePanelReducer, action: ReducerActions): TogglePanelReducer => {
  if (action.type === OnboardingActions.AddFinishedCard) {
    const finishedCards = new Set(...state.finishedCards);

    finishedCards.add(action.payload.cardId);

    const activeSections = setupActiveSections(finishedCards, state.onboardingSteps);

    return {
      ...state,
      activeSections,
    };
  }

  if (action.type === OnboardingActions.RemoveFinishedCard) {
    const finishedCards = new Set(...state.finishedCards);

    finishedCards.delete(action.payload.cardId);

    const activeSections = updateActiveSections({
      finishedCards,
      onboardingSteps: state.onboardingSteps,
    });

    return {
      ...state,
      finishedCards,
      activeSections,
    };
  }

  if (
    action.type === OnboardingActions.ToggleExpandedCard &&
    action.payload.isCardExpanded != null
  ) {
    // It allows Only One step open at a time
    if (action.payload.isCardExpanded === true && action.payload.cardId != null) {
      const expandedCards = new Set<CardId>();

      expandedCards.add(action.payload.cardId);
      return {
        ...state,
        expandedCards,
      };
    }

    if (action.payload.isCardExpanded === false) {
      const expandedCards = new Set(...state.expandedCards);
      expandedCards.delete(action.payload.cardId);
      return {
        ...state,
        expandedCards,
      };
    }
  }

  return state;
};

export const getActiveSectionsInitialStates = ({
  finishedCards,
  onboardingSteps,
}: {
  finishedCards: Set<CardId>;
  onboardingSteps: CardId[];
}) => setupActiveSections(finishedCards, onboardingSteps);

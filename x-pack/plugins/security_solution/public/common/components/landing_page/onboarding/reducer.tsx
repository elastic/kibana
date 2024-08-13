/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupActiveSections } from './helpers';
import type { ReducerActions } from './types';
import { type CardId, type TogglePanelReducer, OnboardingActions } from './types';

export const reducer = (state: TogglePanelReducer, action: ReducerActions): TogglePanelReducer => {
  if (action.type === OnboardingActions.AddFinishedCard) {
    const finishedCardIds: Set<CardId> = new Set([...state.finishedCardIds, action.payload.cardId]);

    const activeSections = setupActiveSections(state.onboardingSteps);

    return {
      ...state,
      finishedCardIds,
      activeSections,
    };
  }

  if (action.type === OnboardingActions.RemoveFinishedCard) {
    const finishedCardIds: Set<CardId> = new Set(...state.finishedCardIds) as Set<CardId>;

    finishedCardIds.delete(action.payload.cardId);

    const activeSections = setupActiveSections(state.onboardingSteps);

    return {
      ...state,
      finishedCardIds,
      activeSections,
    };
  }

  if (
    action.type === OnboardingActions.ToggleExpandedCard &&
    action.payload.isCardExpanded != null
  ) {
    // It allows Only One step open at a time
    if (action.payload.isCardExpanded === true && action.payload.cardId != null) {
      const expandedCardIds: Set<CardId> = new Set<CardId>();

      expandedCardIds.add(action.payload.cardId);

      const activeSections = setupActiveSections(state.onboardingSteps);
      return {
        ...state,
        activeSections,
        expandedCardIds,
      };
    }

    if (action.payload.isCardExpanded === false) {
      const expandedCardIds: Set<CardId> = new Set(...state.expandedCardIds) as Set<CardId>;
      expandedCardIds.delete(action.payload.cardId);

      const activeSections = setupActiveSections(state.onboardingSteps);

      return {
        ...state,
        activeSections,
        expandedCardIds,
      };
    }
  }

  return state;
};

export const getActiveSectionsInitialStates = ({
  onboardingSteps,
}: {
  onboardingSteps: CardId[];
}) => setupActiveSections(onboardingSteps);

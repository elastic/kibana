/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupCards, updateCard } from './helpers';
import {
  CardId,
  GetStartedPageActions,
  ProductId,
  StepId,
  TogglePanelAction,
  TogglePanelReducer,
  ToggleStepAction,
} from './types';

export const reducer = (
  state: TogglePanelReducer,
  action: TogglePanelAction | ToggleStepAction
): TogglePanelReducer => {
  if (action.type === GetStartedPageActions.ToggleSection) {
    const activeSections = new Set([...state.activeSections]);

    if (activeSections.has(action.payload?.section)) {
      activeSections.delete(action.payload?.section);
    } else {
      activeSections.add(action.payload?.section);
    }

    return {
      ...state,
      activeSections,
      activeCards: setupCards(state.finishedSteps, activeSections),
    };
  }

  if (action.type === GetStartedPageActions.AddFinishedStep) {
    const finishedSteps = {
      ...state.finishedSteps,
      [action.payload.cardId]: state.finishedSteps[action.payload.cardId]
        ? new Set([...state.finishedSteps[action.payload.cardId]])
        : new Set(),
    };

    finishedSteps[action.payload.cardId].add(action.payload.stepId);

    return {
      ...state,
      finishedSteps,
      activeCards: updateCard({
        finishedSteps,
        activeSections: state.activeSections,
        activeCards: state.activeCards,
        cardId: action.payload.cardId,
        sectionId: action.payload.sectionId,
      }),
    };
  }

  return state;
};

export const getFinishedStepsInitialStates = ({
  finishedSteps,
}: {
  finishedSteps: Record<CardId, StepId[]>;
}): Record<CardId, Set<StepId>> => {
  const initialStates = Object.entries(finishedSteps).reduce((acc, [cardId, stepIdsByCard]) => {
    if (stepIdsByCard) {
      acc[cardId] = new Set(stepIdsByCard);
    }
    return acc;
  }, {} as Record<string, Set<StepId>>);

  return initialStates;
};

export const getActiveSectionsInitialStates = ({
  activeProducts,
}: {
  activeProducts: ProductId[];
}) => new Set(activeProducts);

export const getActiveCardsInitialStates = ({
  activeSections,
  finishedSteps,
}: {
  activeSections: Set<ProductId>;
  finishedSteps: Record<CardId, Set<StepId>>;
}) => setupCards(finishedSteps, activeSections);

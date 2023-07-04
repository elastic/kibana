/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine } from '../../common/product';
import { setupCards, updateCard } from './helpers';
import {
  type CardId,
  type StepId,
  type ToggleProductAction,
  type TogglePanelReducer,
  type AddFinishedStepAction,
  GetStartedPageActions,
} from './types';

export const reducer = (
  state: TogglePanelReducer,
  action: ToggleProductAction | AddFinishedStepAction
): TogglePanelReducer => {
  if (action.type === GetStartedPageActions.ToggleProduct) {
    const activeProducts = new Set([...state.activeProducts]);

    if (activeProducts.has(action.payload.section)) {
      activeProducts.delete(action.payload.section);
    } else {
      activeProducts.add(action.payload.section);
    }

    return {
      ...state,
      activeProducts,
      activeCards: setupCards(state.finishedSteps, activeProducts),
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
        activeProducts: state.activeProducts,
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
  activeProducts: ProductLine[];
}) => new Set(activeProducts);

export const getActiveCardsInitialStates = ({
  activeProducts,
  finishedSteps,
}: {
  activeProducts: Set<ProductLine>;
  finishedSteps: Record<CardId, Set<StepId>>;
}) => setupCards(finishedSteps, activeProducts);

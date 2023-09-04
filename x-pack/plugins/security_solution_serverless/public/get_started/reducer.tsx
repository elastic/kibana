/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine } from '../../common/product';
import { setupActiveSections, updateActiveSections } from './helpers';
import type { ReducerActions } from './types';
import { type CardId, type StepId, type TogglePanelReducer, GetStartedPageActions } from './types';

export const reducer = (state: TogglePanelReducer, action: ReducerActions): TogglePanelReducer => {
  if (action.type === GetStartedPageActions.ToggleProduct) {
    const activeProducts = new Set([...state.activeProducts]);

    if (activeProducts.has(action.payload.section)) {
      activeProducts.delete(action.payload.section);
    } else {
      activeProducts.add(action.payload.section);
    }

    const { activeSections, totalStepsLeft, totalActiveSteps } = setupActiveSections(
      state.finishedSteps,
      activeProducts
    );

    return {
      ...state,
      activeProducts,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
    };
  }

  if (action.type === GetStartedPageActions.AddFinishedStep) {
    const finishedSteps = {
      ...state.finishedSteps,
      [action.payload.cardId]: state.finishedSteps[action.payload.cardId]
        ? new Set([...state.finishedSteps[action.payload.cardId]])
        : new Set(),
    };

    if (action.type === GetStartedPageActions.AddFinishedStep) {
      finishedSteps[action.payload.cardId].add(action.payload.stepId);
    }

    const { activeSections, totalStepsLeft, totalActiveSteps } = updateActiveSections({
      activeProducts: state.activeProducts,
      activeSections: state.activeSections,
      cardId: action.payload.cardId,
      finishedSteps,
      sectionId: action.payload.sectionId,
    });

    return {
      ...state,
      finishedSteps,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
    };
  }

  if (action.type === GetStartedPageActions.RemoveFinishedStep) {
    const finishedSteps = {
      ...state.finishedSteps,
      [action.payload.cardId]: state.finishedSteps[action.payload.cardId]
        ? new Set([...state.finishedSteps[action.payload.cardId]])
        : new Set(),
    };

    if (action.type === GetStartedPageActions.RemoveFinishedStep) {
      finishedSteps[action.payload.cardId].delete(action.payload.stepId);
    }

    const { activeSections, totalStepsLeft, totalActiveSteps } = updateActiveSections({
      activeProducts: state.activeProducts,
      activeSections: state.activeSections,
      cardId: action.payload.cardId,
      finishedSteps,
      sectionId: action.payload.sectionId,
    });

    return {
      ...state,
      finishedSteps,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
    };
  }

  if (
    action.type === GetStartedPageActions.ToggleExpandedCardStep &&
    action.payload.isCardExpanded != null
  ) {
    return {
      ...state,
      expandedCardSteps: {
        ...state.expandedCardSteps,
        [action.payload.cardId]: {
          expandedSteps: state.expandedCardSteps[action.payload.cardId]?.expandedSteps ?? [],
          isExpanded: action.payload.isCardExpanded,
        },
      },
    };
  }

  if (
    action.type === GetStartedPageActions.ToggleExpandedCardStep &&
    action.payload.isStepExpanded != null
  ) {
    const expandedSteps = new Set(
      [...state.expandedCardSteps[action.payload.cardId]?.expandedSteps] ?? []
    );
    if (action.payload.isStepExpanded === true && action.payload.stepId) {
      expandedSteps.add(action.payload.stepId);
    }

    if (action.payload.isStepExpanded === false && action.payload.stepId) {
      expandedSteps.delete(action.payload.stepId);
    }
    return {
      ...state,
      expandedCardSteps: {
        ...state.expandedCardSteps,
        [action.payload.cardId]: {
          expandedSteps: [...expandedSteps],
          isExpanded: state.expandedCardSteps[action.payload.cardId]?.isExpanded,
        },
      },
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

export const getActiveProductsInitialStates = ({
  activeProducts,
}: {
  activeProducts: ProductLine[];
}) => new Set(activeProducts);

export const getActiveSectionsInitialStates = ({
  activeProducts,
  finishedSteps,
}: {
  activeProducts: Set<ProductLine>;
  finishedSteps: Record<CardId, Set<StepId>>;
}) => setupActiveSections(finishedSteps, activeProducts);

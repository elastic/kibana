/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateSections } from './helpers';
import { sections } from './sections';
import {
  CardId,
  GetStartedPageActions,
  InitSectionsAction,
  ProductId,
  StepId,
  TogglePanelAction,
  TogglePanelReducer,
  ToggleStepAction,
} from './types';

export const reducer = (
  state: TogglePanelReducer,
  action: TogglePanelAction | ToggleStepAction | InitSectionsAction
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
      sections: updateSections(state.finishedSteps, activeSections),
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
      sections: updateSections(finishedSteps, state.activeSections),
    };
  }

  if (action.type === GetStartedPageActions.InitSections) {
    return {
      ...state,
      sections: updateSections(state.finishedSteps, state.activeSections),
    };
  }
  return state;
};

export const getFinishedStepsInitialStates = ({
  finishedSteps,
}: {
  finishedSteps: Record<CardId, StepId[]>;
}): Record<CardId, Set<StepId>> => {
  const initialStates = Object.entries(finishedSteps).reduce((acc, [key, stepIdsByCard]) => {
    if (stepIdsByCard) {
      acc[key] = new Set(stepIdsByCard);
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

export const getSectionsInitialStates = () => sections;

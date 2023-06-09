/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { update } from 'lodash';
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
    if (state.activeSections.has(action.payload?.section)) {
      state.activeSections.delete(action.payload?.section);
    } else {
      state.activeSections.add(action.payload?.section);
    }
    const newActiveSections = new Set([...state.activeSections]);
    return {
      ...state,
      activeSections: newActiveSections,
      sections: updateSections(state.finishedSteps, newActiveSections),
    };
  }

  if (action.type === GetStartedPageActions.AddFinishedStep) {
    if (!state.finishedSteps[action.payload.cardId]) {
      state.finishedSteps[action.payload.cardId] = new Set();
    }
    state.finishedSteps[action.payload.cardId].add(action.payload.stepId);
    const newFinishedSteps = {
      ...state.finishedSteps,
      [action.payload.cardId]: new Set([...state.finishedSteps[action.payload.cardId]]),
    };
    return {
      ...state,
      finishedSteps: newFinishedSteps,
      sections: updateSections(newFinishedSteps, state.activeSections),
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
  finishedSteps: Record<CardId, Record<StepId, boolean>>;
}): Record<CardId, Set<StepId>> => {
  const initialStates = Object.entries(finishedSteps).reduce((acc, [key, value]) => {
    if (value) {
      acc[key] = new Set([...Object.keys(value)]);
    }
    return acc;
  }, {} as Record<string, Set<string>>);

  return initialStates as Record<CardId, Set<StepId>>;
};

export const getActiveSectionsInitialStates = ({
  activeProducts,
}: {
  activeProducts: Record<ProductId, boolean>;
}) => {
  const activeProductIds = [ProductId.analytics, ProductId.cloud, ProductId.endpoint];
  return activeProductIds.reduce((acc, key) => {
    if (activeProducts[key]) {
      acc.add(key);
    }
    return acc;
  }, new Set<ProductId>());
};

export const getSectionsInitialStates = () => sections;

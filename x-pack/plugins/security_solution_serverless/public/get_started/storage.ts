/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductLine } from '../../common/product';
import type { CardId, StepId } from './types';
import {
  QuickStartSectionCardsId,
  AddAndValidateYourDataCardsId,
  GetStartedWithAlertsCardsId,
} from './types';

import { storage } from '../common/lib/storage';
import { defaultFinishedSteps, isDefaultFinishedCardStep } from './helpers';

export const ACTIVE_PRODUCTS_STORAGE_KEY = 'securitySolution.getStarted.activeProducts';
export const FINISHED_STEPS_STORAGE_KEY = 'securitySolution.getStarted.finishedSteps';
export const EXPANDED_CARDS_STORAGE_KEY = 'securitySolution.getStarted.expandedCards';

export const defaultExpandedCards = {
  [QuickStartSectionCardsId.watchTheOverviewVideo]: { isExpanded: false, expandedSteps: [] },
  [QuickStartSectionCardsId.createFirstProject]: { isExpanded: false, expandedSteps: [] },
  [AddAndValidateYourDataCardsId.addIntegrations]: { isExpanded: false, expandedSteps: [] },
  [AddAndValidateYourDataCardsId.viewDashboards]: { isExpanded: false, expandedSteps: [] },
  [GetStartedWithAlertsCardsId.enablePrebuiltRules]: { isExpanded: false, expandedSteps: [] },
  [GetStartedWithAlertsCardsId.viewAlerts]: { isExpanded: false, expandedSteps: [] },
};

export const getStartedStorage = {
  getActiveProductsFromStorage: () => {
    const activeProducts: ProductLine[] = storage.get(ACTIVE_PRODUCTS_STORAGE_KEY);
    return activeProducts ?? [];
  },
  toggleActiveProductsInStorage: (productId: ProductLine) => {
    const activeProducts: ProductLine[] = storage.get(ACTIVE_PRODUCTS_STORAGE_KEY) ?? [];
    const index = activeProducts.indexOf(productId);
    if (index < 0) {
      activeProducts.push(productId);
    } else {
      activeProducts.splice(index, 1);
    }
    storage.set(ACTIVE_PRODUCTS_STORAGE_KEY, activeProducts);
    return activeProducts;
  },
  getFinishedStepsFromStorageByCardId: (cardId: CardId) => {
    const finishedSteps = storage.get(FINISHED_STEPS_STORAGE_KEY) ?? {};
    const card: StepId[] = finishedSteps[cardId] ?? [];
    return card;
  },
  getAllFinishedStepsFromStorage: () => {
    const allFinishedSteps: Record<CardId, StepId[]> = storage.get(FINISHED_STEPS_STORAGE_KEY);

    if (allFinishedSteps == null) {
      storage.set(FINISHED_STEPS_STORAGE_KEY, defaultFinishedSteps);
    } else {
      if (
        allFinishedSteps[QuickStartSectionCardsId.createFirstProject] == null ||
        allFinishedSteps[QuickStartSectionCardsId.createFirstProject].length === 0
      ) {
        storage.set(FINISHED_STEPS_STORAGE_KEY, { ...allFinishedSteps, ...defaultFinishedSteps });
      }
    }
    return storage.get(FINISHED_STEPS_STORAGE_KEY);
  },

  addFinishedStepToStorage: (cardId: CardId, stepId: StepId) => {
    const finishedSteps = getStartedStorage.getAllFinishedStepsFromStorage();
    const card: StepId[] = finishedSteps[cardId] ?? [];
    if (card.indexOf(stepId) < 0) {
      card.push(stepId);
      storage.set(FINISHED_STEPS_STORAGE_KEY, { ...finishedSteps, [cardId]: card });
    }
  },
  removeFinishedStepFromStorage: (cardId: CardId, stepId: StepId) => {
    if (isDefaultFinishedCardStep(cardId, stepId)) {
      return;
    }
    const finishedSteps = getStartedStorage.getAllFinishedStepsFromStorage();
    const steps: StepId[] = finishedSteps[cardId] ?? [];
    const index = steps.indexOf(stepId);
    if (index >= 0) {
      steps.splice(index, 1);
    }
    storage.set(FINISHED_STEPS_STORAGE_KEY, { ...finishedSteps, [cardId]: steps });
  },
  getAllExpandedCardStepsFromStorage: () => {
    const storageData = storage.get(EXPANDED_CARDS_STORAGE_KEY);

    return !storageData || Object.keys(storageData).length === 0
      ? defaultExpandedCards
      : storageData;
  },
  resetAllExpandedCardStepsToStorage: () => {
    const activeCards: Record<CardId, { isExpanded: boolean; expandedSteps: StepId[] }> =
      getStartedStorage.getAllExpandedCardStepsFromStorage();

    storage.set(
      EXPANDED_CARDS_STORAGE_KEY,
      Object.entries(activeCards).reduce((acc, [cardId, card]) => {
        acc[cardId as CardId] = { ...card, expandedSteps: [] };
        return acc;
      }, {} as Record<CardId, { isExpanded: boolean; expandedSteps: StepId[] }>)
    );
  },
  addExpandedCardStepToStorage: (cardId: CardId, stepId?: StepId) => {
    const activeCards: Record<CardId, { isExpanded: boolean; expandedSteps: StepId[] }> =
      getStartedStorage.getAllExpandedCardStepsFromStorage();
    const card = activeCards[cardId]
      ? { ...activeCards[cardId], isExpanded: true }
      : {
          isExpanded: true,
          expandedSteps: [],
        };

    if (stepId && card && card.expandedSteps.indexOf(stepId) < 0) {
      card.expandedSteps.push(stepId);
    }
    storage.set(EXPANDED_CARDS_STORAGE_KEY, { ...activeCards, [cardId]: card });
  },
  removeExpandedCardStepFromStorage: (cardId: CardId, stepId?: StepId) => {
    const activeCards: Record<
      CardId,
      { isExpanded: boolean; expandedSteps: StepId[] } | undefined
    > = storage.get(EXPANDED_CARDS_STORAGE_KEY) ?? {};
    const card = activeCards[cardId];
    if (card && !stepId) {
      card.isExpanded = false;
    }
    if (card && stepId) {
      const index = card.expandedSteps.indexOf(stepId);
      if (index >= 0) {
        card.expandedSteps.splice(index, 1);
      }
    }
    storage.set(EXPANDED_CARDS_STORAGE_KEY, { ...activeCards, [cardId]: card });
  },
};

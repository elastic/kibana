/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CardId, StepId } from './types';

import {
  QuickStartSectionCardsId,
  AddAndValidateYourDataCardsId,
  GetStartedWithAlertsCardsId,
} from './types';

import { DEFAULT_FINISHED_STEPS, isDefaultFinishedCardStep } from './helpers';
import { getSections } from './sections';
import { storage } from '../../../lib/local_storage';
import type { ProductLine } from './configs';

export const ACTIVE_PRODUCTS_STORAGE_KEY = 'securitySolution.getStarted.activeProducts';
export const FINISHED_STEPS_STORAGE_KEY = 'securitySolution.getStarted.finishedSteps';
export const EXPANDED_CARDS_STORAGE_KEY = 'securitySolution.getStarted.expandedCards';

export const getStorageKeyBySpace = (storageKey: string, spaceId: string | null | undefined) => {
  if (spaceId == null) {
    return storageKey;
  }
  return `${storageKey}.${spaceId}`;
};

export const defaultExpandedCards = {
  [QuickStartSectionCardsId.watchTheOverviewVideo]: { isExpanded: false, expandedSteps: [] },
  [QuickStartSectionCardsId.createFirstProject]: { isExpanded: false, expandedSteps: [] },
  [AddAndValidateYourDataCardsId.addIntegrations]: { isExpanded: false, expandedSteps: [] },
  [AddAndValidateYourDataCardsId.viewDashboards]: { isExpanded: false, expandedSteps: [] },
  [GetStartedWithAlertsCardsId.enablePrebuiltRules]: { isExpanded: false, expandedSteps: [] },
  [GetStartedWithAlertsCardsId.viewAlerts]: { isExpanded: false, expandedSteps: [] },
};

export class OnboardingStorage {
  private finishedStepsStorageKey: string;
  private activeProductsStorageKey: string;
  private expandedCardsStorageKey: string;

  constructor(spaceId: string | undefined) {
    this.finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);
    this.activeProductsStorageKey = getStorageKeyBySpace(ACTIVE_PRODUCTS_STORAGE_KEY, spaceId);
    this.expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);
  }
  setDefaultFinishedSteps = (cardId: CardId) => {
    const finishedStepsStorageKey = this.finishedStepsStorageKey;

    const allFinishedSteps: Record<CardId, StepId[]> = storage.get(finishedStepsStorageKey);

    const defaultFinishedStepsByCardId = DEFAULT_FINISHED_STEPS[cardId];

    const hasDefaultFinishedSteps = defaultFinishedStepsByCardId != null;
    if (!hasDefaultFinishedSteps) {
      return;
    }

    storage.set(finishedStepsStorageKey, {
      ...allFinishedSteps,
      [cardId]: Array.from(
        // dedupe card steps
        new Set([...(defaultFinishedStepsByCardId ?? []), ...(allFinishedSteps[cardId] ?? [])])
      ),
    });
  };
  public getActiveProductsFromStorage = () => {
    const activeProductsStorageKey = this.activeProductsStorageKey;
    const activeProducts: ProductLine[] = storage.get(activeProductsStorageKey);
    return activeProducts ?? [];
  };
  public toggleActiveProductsInStorage = (productId: ProductLine) => {
    const activeProductsStorageKey = this.activeProductsStorageKey;
    const activeProducts: ProductLine[] = storage.get(activeProductsStorageKey) ?? [];
    const index = activeProducts.indexOf(productId);
    if (index < 0) {
      activeProducts.push(productId);
    } else {
      activeProducts.splice(index, 1);
    }
    storage.set(activeProductsStorageKey, activeProducts);
    return activeProducts;
  };
  getFinishedStepsFromStorageByCardId = (cardId: CardId) => {
    const finishedSteps = this.getAllFinishedStepsFromStorage();
    const steps: StepId[] = finishedSteps[cardId] ?? [];
    return steps;
  };
  public getAllFinishedStepsFromStorage = () => {
    const finishedStepsStorageKey = this.finishedStepsStorageKey;
    const allFinishedSteps: Record<CardId, StepId[]> = storage.get(finishedStepsStorageKey);

    if (allFinishedSteps == null) {
      storage.set(finishedStepsStorageKey, DEFAULT_FINISHED_STEPS);
    } else {
      getSections().forEach((section) => {
        section.cards?.forEach((card) => {
          this.setDefaultFinishedSteps(card.id);
        });
      });
    }
    return storage.get(finishedStepsStorageKey);
  };

  public addFinishedStepToStorage = (cardId: CardId, stepId: StepId) => {
    const finishedStepsStorageKey = this.finishedStepsStorageKey;
    const finishedSteps = this.getAllFinishedStepsFromStorage();
    const card: StepId[] = finishedSteps[cardId] ?? [];
    if (card.indexOf(stepId) < 0) {
      card.push(stepId);
      storage.set(finishedStepsStorageKey, { ...finishedSteps, [cardId]: card });
    }
  };
  public removeFinishedStepFromStorage = (
    cardId: CardId,
    stepId: StepId,
    onboardingSteps: StepId[]
  ) => {
    if (isDefaultFinishedCardStep(cardId, stepId, onboardingSteps)) {
      return;
    }
    const finishedStepsStorageKey = this.finishedStepsStorageKey;

    const finishedSteps = this.getAllFinishedStepsFromStorage();
    const steps: StepId[] = finishedSteps[cardId] ?? [];
    const index = steps.indexOf(stepId);
    if (index >= 0) {
      steps.splice(index, 1);
    }
    storage.set(finishedStepsStorageKey, { ...finishedSteps, [cardId]: steps });
  };
  public getAllExpandedCardStepsFromStorage = () => {
    const expandedCardsStorageKey = this.expandedCardsStorageKey;
    const storageData = storage.get(expandedCardsStorageKey);

    return !storageData || Object.keys(storageData).length === 0
      ? defaultExpandedCards
      : storageData;
  };
  public resetAllExpandedCardStepsToStorage = () => {
    const activeCards: Record<CardId, { isExpanded: boolean; expandedSteps: StepId[] }> =
      this.getAllExpandedCardStepsFromStorage();
    const expandedCardsStorageKey = this.expandedCardsStorageKey;

    storage.set(
      expandedCardsStorageKey,
      Object.entries(activeCards).reduce((acc, [cardId, card]) => {
        acc[cardId as CardId] = defaultExpandedCards[cardId as CardId] ?? card;
        return acc;
      }, {} as Record<CardId, { isExpanded: boolean; expandedSteps: StepId[] }>)
    );
  };
  public addExpandedCardStepToStorage = (cardId: CardId, stepId: StepId) => {
    const activeCards: Record<CardId, { isExpanded: boolean; expandedSteps: StepId[] }> =
      this.getAllExpandedCardStepsFromStorage();
    const expandedCardsStorageKey = this.expandedCardsStorageKey;

    const card = activeCards[cardId]
      ? {
          expandedSteps: [stepId],
          isExpanded: true,
        }
      : {
          isExpanded: false,
          expandedSteps: [],
        };

    storage.set(expandedCardsStorageKey, { ...activeCards, [cardId]: card });
  };
  public removeExpandedCardStepFromStorage = (cardId: CardId, stepId?: StepId) => {
    const expandedCardsStorageKey = this.expandedCardsStorageKey;

    const activeCards: Record<
      CardId,
      { isExpanded: boolean; expandedSteps: StepId[] } | undefined
    > = storage.get(expandedCardsStorageKey) ?? {};
    const card = activeCards[cardId];
    if (card && !stepId) {
      card.isExpanded = false;
    }
    if (card && stepId) {
      const index = card.expandedSteps.indexOf(stepId);
      if (index >= 0) {
        card.expandedSteps.splice(index, 1);
        card.isExpanded = false;
      }
    }
    storage.set(expandedCardsStorageKey, { ...activeCards, [cardId]: card });
  };
}

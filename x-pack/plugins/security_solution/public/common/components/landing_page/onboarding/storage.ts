/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CardId } from './types';

import { DEFAULT_FINISHED_CARDS, isDefaultFinishedCard } from './helpers';
import { storage } from '../../../lib/local_storage';

export const FINISHED_CARDS_STORAGE_KEY = 'securitySolution.onboarding.finishedCards';
export const EXPANDED_CARDS_STORAGE_KEY = 'securitySolution.onboarding.expandedCardIds';

export const getStorageKeyBySpace = (storageKey: string, spaceId: string | null | undefined) => {
  if (spaceId == null) {
    return storageKey;
  }
  return `${storageKey}.${spaceId}`;
};

export const defaultExpandedCards = [];

export class OnboardingStorage {
  private finishedCardsStorageKey: string;
  private expandedCardsStorageKey: string;

  constructor(spaceId: string | undefined) {
    this.finishedCardsStorageKey = getStorageKeyBySpace(FINISHED_CARDS_STORAGE_KEY, spaceId);
    this.expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);
  }
  setDefaultFinishedCards = () => {
    const finishedCardsStorageKey = this.finishedCardsStorageKey;

    storage.set(finishedCardsStorageKey, DEFAULT_FINISHED_CARDS);
  };

  public getAllFinishedCardsFromStorage = () => {
    const finishedCardsStorageKey = this.finishedCardsStorageKey;
    const allFinishedCards: CardId[] = storage.get(finishedCardsStorageKey);

    if (allFinishedCards == null) {
      storage.set(finishedCardsStorageKey, DEFAULT_FINISHED_CARDS);
    }
    return storage.get(finishedCardsStorageKey);
  };

  public addFinishedCardToStorage = (cardId: CardId) => {
    const finishedCardsStorageKey = this.finishedCardsStorageKey;
    const finishedCards = this.getAllFinishedCardsFromStorage() ?? [];
    if (finishedCards.indexOf(cardId) < 0) {
      finishedCards.push(cardId);
      storage.set(finishedCardsStorageKey, finishedCards);
    }
  };
  public removeFinishedCardFromStorage = (cardId: CardId, onboardingSteps: CardId[]) => {
    if (isDefaultFinishedCard(cardId, onboardingSteps)) {
      return;
    }
    const finishedCardsStorageKey = this.finishedCardsStorageKey;

    const cardIds: CardId[] = this.getAllFinishedCardsFromStorage() ?? [];
    const index = cardIds.indexOf(cardId);
    if (index >= 0) {
      cardIds.splice(index, 1);
    }
    storage.set(finishedCardsStorageKey, cardIds);
  };
  public getAllExpandedCardsFromStorage = () => {
    const expandedCardsStorageKey = this.expandedCardsStorageKey;
    const storageData = storage.get(expandedCardsStorageKey);

    return !storageData || Object.keys(storageData).length === 0
      ? defaultExpandedCards
      : storageData;
  };
  public resetAllExpandedCardsToStorage = () => {
    const expandedCardsStorageKey = this.expandedCardsStorageKey;

    storage.set(expandedCardsStorageKey, defaultExpandedCards);
  };
  public addExpandedCardToStorage = (cardId: CardId) => {
    const expandedCardIds: string[] = this.getAllExpandedCardsFromStorage();
    const expandedCardsStorageKey = this.expandedCardsStorageKey;

    const cards =
      expandedCardIds.indexOf(cardId) < 0 ? [...expandedCardIds, cardId] : expandedCardIds;

    storage.set(expandedCardsStorageKey, cards);
  };
  public removeExpandedCardFromStorage = (cardId: CardId) => {
    const expandedCardsStorageKey = this.expandedCardsStorageKey;

    const activeCards: CardId[] = storage.get(expandedCardsStorageKey) ?? [];
    const index = activeCards.indexOf(cardId);
    if (index >= 0) {
      activeCards.splice(index, 1);
    }
    storage.set(expandedCardsStorageKey, activeCards);
  };
}

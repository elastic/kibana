/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CardId } from './types';
import { QuickStart } from './types';
import { storage } from '../common/lib/storage';

export const FINISHED_CARDS_STORAGE_KEY = 'securitySolution.getStarted.finishedCards';

const defaultFinishedCards = [QuickStart.createFirstProject];

export const getStartedStorage = {
  getAllFinishedCardsFromStorage: () => {
    const allFinishedSteps: CardId[] = storage.get(FINISHED_CARDS_STORAGE_KEY);
    if (allFinishedSteps == null) {
      storage.set(FINISHED_CARDS_STORAGE_KEY, defaultFinishedCards);
    } else {
      if (allFinishedSteps.length === 0) {
        storage.set(FINISHED_CARDS_STORAGE_KEY, defaultFinishedCards);
      }
    }
    return storage.get(FINISHED_CARDS_STORAGE_KEY);
  },
  addFinishedCardToStorage: (cardId: CardId) => {
    const finishedCards: CardId[] = getStartedStorage.getAllFinishedCardsFromStorage();
    if (finishedCards.indexOf(cardId) < 0) {
      finishedCards.push(cardId);
      storage.set(FINISHED_CARDS_STORAGE_KEY, finishedCards);
    }
  },
  removeFinishedCardFromStorage: (cardId: CardId) => {
    const finishedCards: CardId[] = getStartedStorage.getAllFinishedCardsFromStorage();
    const index = finishedCards.indexOf(cardId);
    if (index >= 0) {
      finishedCards.splice(index, 1);
    }
    storage.set(FINISHED_CARDS_STORAGE_KEY, finishedCards);
  },
};

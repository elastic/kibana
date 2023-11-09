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

export const defaultFinishedCards: CardId[] = [QuickStart.createFirstProject];

export const getStartedStorage = {
  getAllFinishedCardsFromStorage: () => {
    const allFinishedSteps: CardId[] = storage.get(FINISHED_CARDS_STORAGE_KEY);
    const cardsDone = [...defaultFinishedCards];
    if (allFinishedSteps == null) {
      storage.set(FINISHED_CARDS_STORAGE_KEY, cardsDone);
    } else {
      if (allFinishedSteps.length === 0) {
        storage.set(FINISHED_CARDS_STORAGE_KEY, cardsDone);
      }
    }
    return storage.get(FINISHED_CARDS_STORAGE_KEY);
  },
  addFinishedCardToStorage: (cardId: CardId) => {
    const finishedCards: CardId[] = getStartedStorage.getAllFinishedCardsFromStorage();
    if (finishedCards.indexOf(cardId) < 0) {
      const cardsDone = [...finishedCards, cardId];
      storage.set(FINISHED_CARDS_STORAGE_KEY, cardsDone);
    }
  },
  removeFinishedCardFromStorage: (cardId: CardId) => {
    const finishedCards: CardId[] = getStartedStorage.getAllFinishedCardsFromStorage();
    const index = finishedCards.indexOf(cardId);

    if (index >= 0 && defaultFinishedCards.indexOf(cardId) < 0) {
      const cardsDone = [...finishedCards];
      cardsDone.splice(index, 1);
      storage.set(FINISHED_CARDS_STORAGE_KEY, cardsDone);
    }
  },
};

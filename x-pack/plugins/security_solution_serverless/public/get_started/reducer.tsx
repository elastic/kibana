/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTotalUndoneCardsNumber } from './helpers';
import type { ReducerActions } from './types';
import { type CardId, type TogglePanelReducer, GetStartedPageActions } from './types';

export const reducer = (state: TogglePanelReducer, action: ReducerActions): TogglePanelReducer => {
  if (action.type === GetStartedPageActions.AddFinishedCard) {
    const finishedCards: Set<CardId> = state.finishedCards.has(action.payload.cardId)
      ? state.finishedCards
      : new Set([...state.finishedCards, action.payload.cardId]);

    const totalCardsLeft = getTotalUndoneCardsNumber(finishedCards.size);

    return {
      finishedCards,
      totalCardsLeft,
    };
  }

  if (action.type === GetStartedPageActions.RemoveFinishedCard) {
    if (state.finishedCards.has(action.payload.cardId)) {
      const finishedCards = new Set([...state.finishedCards]);
      finishedCards.delete(action.payload.cardId);

      const totalCardsLeft = getTotalUndoneCardsNumber(finishedCards.size);

      return {
        finishedCards,
        totalCardsLeft,
      };
    }
  }

  return state;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import { getStartedStorage } from './storage';
import { reducer } from './reducer';
import type { CardId, ToggleFinishedCard } from './types';
import { GetStartedPageActions } from './types';
import { getTotalUndoneCardsNumber } from './helpers';

export const useTogglePanel = () => {
  const {
    getAllFinishedCardsFromStorage,
    addFinishedCardToStorage,
    removeFinishedCardFromStorage,
  } = getStartedStorage;

  const finishedCardsInitialStates = useMemo(() => {
    const finishedCards: CardId[] = getAllFinishedCardsFromStorage();
    return new Set(finishedCards);
  }, [getAllFinishedCardsFromStorage]);

  const [state, dispatch] = useReducer(reducer, {
    finishedCards: finishedCardsInitialStates,
    totalCardsLeft: getTotalUndoneCardsNumber(finishedCardsInitialStates.size),
  });

  const toggleFinishedCard: ToggleFinishedCard = useCallback(
    ({ cardId, undo }) => {
      dispatch({
        type: undo
          ? GetStartedPageActions.RemoveFinishedCard
          : GetStartedPageActions.AddFinishedCard,
        payload: { cardId },
      });
      if (undo) {
        removeFinishedCardFromStorage(cardId);
      } else {
        addFinishedCardToStorage(cardId);
      }
    },
    [addFinishedCardToStorage, removeFinishedCardFromStorage]
  );

  return { state, toggleFinishedCard };
};

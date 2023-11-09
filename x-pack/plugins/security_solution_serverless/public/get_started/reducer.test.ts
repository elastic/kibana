/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useReducer } from 'react';
import { reducer } from './reducer';
import { GetStartedPageActions, QuickStart } from './types';

describe('reducer', () => {
  const initialState = {
    finishedCards: new Set([QuickStart.createFirstProject]),
    totalCardsLeft: 5,
  };

  it('should return initial finished cards correctly', async () => {
    const { result } = renderHook(() => useReducer(reducer, initialState));

    expect(result.current[0]).toEqual(expect.objectContaining(initialState));
  });

  it('should add a finished card correctly', async () => {
    const { result } = renderHook(() => useReducer(reducer, initialState));
    const [_, dispatch] = result.current;

    act(() => {
      dispatch({
        type: GetStartedPageActions.AddFinishedCard,
        payload: { cardId: QuickStart.watchTheOverviewVideo },
      });
    });

    expect(result.current[0]).toEqual(
      expect.objectContaining({
        finishedCards: new Set([QuickStart.createFirstProject, QuickStart.watchTheOverviewVideo]),
        totalCardsLeft: 4,
      })
    );
  });

  it('should remove a finished card correctly', () => {
    const { result } = renderHook(() =>
      useReducer(reducer, {
        finishedCards: new Set([QuickStart.createFirstProject, QuickStart.watchTheOverviewVideo]),
        totalCardsLeft: 4,
      })
    );
    const [_, dispatch] = result.current;

    act(() => {
      dispatch({
        type: GetStartedPageActions.RemoveFinishedCard,
        payload: { cardId: QuickStart.watchTheOverviewVideo },
      });
    });

    expect(result.current[0]).toEqual(
      expect.objectContaining({
        finishedCards: new Set([QuickStart.createFirstProject]),
        totalCardsLeft: 5,
      })
    );
  });

  it('should not remove a finished card if the card is finished by default', () => {
    const { result } = renderHook(() =>
      useReducer(reducer, {
        finishedCards: new Set([QuickStart.createFirstProject, QuickStart.watchTheOverviewVideo]),
        totalCardsLeft: 4,
      })
    );
    const [_, dispatch] = result.current;

    act(() => {
      dispatch({
        type: GetStartedPageActions.RemoveFinishedCard,
        payload: { cardId: QuickStart.createFirstProject },
      });
    });

    expect(result.current[0]).toEqual(
      expect.objectContaining({
        finishedCards: new Set([QuickStart.createFirstProject, QuickStart.watchTheOverviewVideo]),
        totalCardsLeft: 4,
      })
    );
  });
});

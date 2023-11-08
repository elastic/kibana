/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useTogglePanel } from './use_toggle_panel';
import { getStartedStorage } from '../storage';

import { QuickStart } from '../types';

jest.mock('../storage');

describe('useTogglePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (getStartedStorage.getAllFinishedCardsFromStorage as jest.Mock).mockReturnValue(
      new Set([QuickStart.createFirstProject])
    );
  });

  test('should initialize state with correct initial values ', () => {
    const { result } = renderHook(() => useTogglePanel());

    const { state } = result.current;

    expect(state.totalCardsLeft).toEqual(5);
    expect(state.finishedCards.size).toEqual(1);
  });

  test('should add a finished card', () => {
    const { result } = renderHook(() => useTogglePanel());

    const { toggleFinishedCard } = result.current;

    toggleFinishedCard({ cardId: QuickStart.createFirstProject });

    expect(getStartedStorage.addFinishedCardToStorage).toBeCalledWith(
      QuickStart.createFirstProject
    );
  });

  test('should undo a finished card', () => {
    const { result } = renderHook(() => useTogglePanel());

    const { toggleFinishedCard } = result.current;

    toggleFinishedCard({ cardId: QuickStart.createFirstProject, undo: true });

    expect(getStartedStorage.removeFinishedCardFromStorage).toBeCalledWith(
      QuickStart.createFirstProject
    );
  });
});

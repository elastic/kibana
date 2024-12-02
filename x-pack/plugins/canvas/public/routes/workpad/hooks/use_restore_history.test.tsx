/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useRestoreHistory } from './use_restore_history';
import { encode } from '../route_state';

const mockDispatch = jest.fn();
const mockGetLocation = jest.fn();
const mockGetHistory = jest.fn();

const location = { state: undefined };
const history = { action: 'POP' };

// Mock the hooks and actions
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => mockGetLocation(),
  useHistory: () => mockGetHistory(),
}));

jest.mock('../../../state/actions/workpad', () => ({
  initializeWorkpad: () => ({ type: 'initialize' }),
}));

describe('useRestoreHistory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('dispatches nothing on initial run', () => {
    mockGetLocation.mockReturnValue(location);
    mockGetHistory.mockReturnValue(history);
    renderHook(() => useRestoreHistory());

    expect(mockDispatch).not.toBeCalled();
  });

  test('dispatches nothing on a non pop event', () => {
    mockGetLocation.mockReturnValue(location);
    mockGetHistory.mockReturnValue({ action: 'not-pop' });
    const { rerender } = renderHook(() => useRestoreHistory());

    expect(mockDispatch).not.toBeCalled();

    mockGetLocation.mockReturnValue({ state: encode({ some: 'state' }) });
    rerender();

    expect(mockDispatch).not.toBeCalled();
  });

  test('dispatches restore history if state changes on a POP action', () => {
    const oldState = { a: 'a', b: 'b' };
    const newState = { c: 'c', d: 'd' };

    mockGetHistory.mockReturnValue(history);
    mockGetLocation.mockReturnValue({
      state: encode(oldState),
    });

    const { rerender } = renderHook(() => useRestoreHistory());

    mockGetLocation.mockReturnValue({
      state: encode(newState),
    });

    rerender();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'restoreHistory', payload: newState });
  });
});

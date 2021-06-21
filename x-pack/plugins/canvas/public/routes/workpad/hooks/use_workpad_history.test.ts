/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useWorkpadHistory } from './use_workpad_history';
import { encode } from '../route_state';

const mockGetState = jest.fn();
const mockGetHistory = jest.fn();

// Mock the hooks and actions used by the UseWorkpad hook
jest.mock('react-router-dom', () => ({
  useHistory: () => mockGetHistory(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(mockGetState()),
}));

describe('useRestoreHistory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('replaces undefined state with current state', () => {
    const history = {
      location: {
        state: undefined,
        pathname: 'somepath',
      },
      push: jest.fn(),
      replace: jest.fn(),
    };

    const state = {
      persistent: { some: 'state' },
    };

    mockGetState.mockReturnValue(state);
    mockGetHistory.mockReturnValue(history);

    renderHook(() => useWorkpadHistory());

    expect(history.replace).toBeCalledWith(history.location.pathname, encode(state.persistent));
  });

  test('does not do a push on initial render if states do not match', () => {
    const history = {
      location: {
        state: encode({ old: 'state' }),
        pathname: 'somepath',
      },
      push: jest.fn(),
      replace: jest.fn(),
    };

    const state = {
      persistent: { some: 'state' },
    };

    mockGetState.mockReturnValue(state);
    mockGetHistory.mockReturnValue(history);

    renderHook(() => useWorkpadHistory());

    expect(history.push).not.toBeCalled();
  });

  test('rerender does a push if location state does not match store state', () => {
    const history = {
      location: {
        state: encode({ old: 'state' }),
        pathname: 'somepath',
      },
      push: jest.fn(),
      replace: jest.fn(),
    };

    const oldState = {
      persistent: { some: 'state' },
    };

    const newState = {
      persistent: { new: 'state' },
    };

    mockGetState.mockReturnValue(oldState);
    mockGetHistory.mockReturnValue(history);

    const { rerender } = renderHook(() => useWorkpadHistory());

    mockGetState.mockReturnValue(newState);
    rerender();

    expect(history.push).toBeCalledWith(history.location.pathname, encode(newState.persistent));
  });
});

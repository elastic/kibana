/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useWorkpadPersist } from './use_workpad_persist';

const mockGetState = jest.fn();
const mockUpdateWorkpad = jest.fn();
const mockUpdateAssets = jest.fn();
const mockUpdate = jest.fn();
const mockNotifyError = jest.fn();

// Mock the hooks and actions used by the UseWorkpad hook
jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector(mockGetState()),
}));

jest.mock('../../../services', () => ({
  useWorkpadService: () => ({
    updateWorkpad: mockUpdateWorkpad,
    updateAssets: mockUpdateAssets,
    update: mockUpdate,
  }),
  useNotifyService: () => ({
    error: mockNotifyError,
  }),
}));

describe('useWorkpadPersist', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('initial render does not persist state', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    renderHook(useWorkpadPersist);

    expect(mockUpdateWorkpad).not.toBeCalled();
    expect(mockUpdateAssets).not.toBeCalled();
    expect(mockUpdate).not.toBeCalled();
  });

  test('changes to workpad cause a workpad update', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      ...state,
      persistent: {
        workpad: { new: 'workpad' },
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdateWorkpad).toHaveBeenCalled();
  });

  test('changes to assets cause an asset update', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      ...state,
      assets: {
        asset1: 'some asset',
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdateAssets).toHaveBeenCalled();
  });

  test('changes to both assets and workpad causes a full update', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };

    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      persistent: {
        workpad: { new: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdate).toHaveBeenCalled();
  });

  test('non changes causes no updated', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
    };
    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    rerender();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
    expect(mockUpdateAssets).not.toHaveBeenCalled();
  });

  test('non write permissions causes no updates', () => {
    const state = {
      persistent: {
        workpad: { some: 'workpad' },
      },
      assets: {
        asset1: 'some asset',
        asset2: 'other asset',
      },
      transient: {
        canUserWrite: false,
      },
    };
    mockGetState.mockReturnValue(state);

    const { rerender } = renderHook(useWorkpadPersist);

    const newState = {
      persistent: {
        workpad: { new: 'workpad value' },
      },
      assets: {
        asset3: 'something',
      },
      transient: {
        canUserWrite: false,
      },
    };
    mockGetState.mockReturnValue(newState);

    rerender();

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateWorkpad).not.toHaveBeenCalled();
    expect(mockUpdateAssets).not.toHaveBeenCalled();
  });
});

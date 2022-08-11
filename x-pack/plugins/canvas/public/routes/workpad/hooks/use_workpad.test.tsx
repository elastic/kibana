/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useWorkpad } from './use_workpad';

const mockDispatch = jest.fn();
const mockSelector = jest.fn();
const mockResolveWorkpad = jest.fn();
const mockRedirectLegacyUrl = jest.fn();

const workpad = {
  id: 'someworkpad',
  pages: [],
};

const assets = [{ id: 'asset-id' }];

const workpadResponse = {
  ...workpad,
  assets,
};

// Mock the hooks and actions used by the UseWorkpad hook
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => mockSelector,
}));

jest.mock('../../../services', () => ({
  useWorkpadService: () => ({
    resolve: mockResolveWorkpad,
  }),
  usePlatformService: () => ({
    redirectLegacyUrl: mockRedirectLegacyUrl,
  }),
}));

jest.mock('../../../state/actions/workpad', () => ({
  setWorkpad: (payload: any) => ({
    type: 'setWorkpad',
    payload,
  }),
}));

describe('useWorkpad', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('fires request to load workpad and dispatches results', async () => {
    const workpadId = 'someworkpad';
    const getRedirectPath = (id: string) => id;
    mockResolveWorkpad.mockResolvedValue({
      outcome: 'exactMatch',
      workpad: workpadResponse,
    });

    const { waitFor, unmount } = renderHook(() => useWorkpad(workpadId, true, getRedirectPath));

    try {
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(3));

      expect(mockResolveWorkpad).toHaveBeenCalledWith(workpadId);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setAssets', payload: assets });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setWorkpad', payload: workpad });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setZoomScale', payload: 1 });
    } catch (e) {
      throw e;
    } finally {
      unmount();
    }
  });

  test('sets alias id of workpad on a conflict', async () => {
    const workpadId = 'someworkpad';
    const getRedirectPath = (id: string) => id;
    const aliasId = 'someworkpad-alias';
    mockResolveWorkpad.mockResolvedValue({
      outcome: 'conflict',
      workpad: workpadResponse,
      aliasId,
    });

    const { waitFor, unmount } = renderHook(() => useWorkpad(workpadId, true, getRedirectPath));

    try {
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledTimes(3));

      expect(mockResolveWorkpad).toHaveBeenCalledWith(workpadId);
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setAssets', payload: assets });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'setWorkpad',
        payload: { ...workpad, aliasId },
      });
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'setZoomScale', payload: 1 });
    } catch (e) {
      throw e;
    } finally {
      unmount();
    }
  });

  test('redirects on alias match', async () => {
    const workpadId = 'someworkpad';
    const getRedirectPath = (id: string) => id;
    const aliasId = 'someworkpad-alias';
    mockResolveWorkpad.mockResolvedValue({
      outcome: 'aliasMatch',
      workpad: workpadResponse,
      aliasId,
      aliasPurpose: 'savedObjectConversion',
    });

    const { waitFor, unmount } = renderHook(() => useWorkpad(workpadId, true, getRedirectPath));
    try {
      await waitFor(() => expect(mockRedirectLegacyUrl).toHaveBeenCalled());
      expect(mockRedirectLegacyUrl).toBeCalledWith({
        path: `#${aliasId}`,
        aliasPurpose: 'savedObjectConversion',
        objectNoun: 'Workpad',
      });
    } catch (e) {
      throw e;
    } finally {
      unmount();
    }
  });
});

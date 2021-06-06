/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { useWorkpad } from './use_workpad';

const mockDispatch = jest.fn();
const mockSelector = jest.fn();
const mockGetWorkpad = jest.fn();

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
  useServices: () => ({
    workpad: {
      get: mockGetWorkpad,
    },
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
    mockGetWorkpad.mockResolvedValue(workpadResponse);

    renderHook(() => useWorkpad(workpadId));

    await waitFor(() => expect(mockGetWorkpad).toHaveBeenCalledWith(workpadId));

    expect(mockGetWorkpad).toHaveBeenCalledWith(workpadId);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setAssets', payload: assets });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setWorkpad', payload: workpad });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'setZoomScale', payload: 1 });
  });
});

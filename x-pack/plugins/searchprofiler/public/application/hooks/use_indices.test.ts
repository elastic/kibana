/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { renderHook } from '@testing-library/react-hooks';
import { useAppContext } from '../contexts/app_context';
import { useIndices } from './use_indices';
import { waitFor } from '@testing-library/dom';

jest.mock('../contexts/app_context');

describe('useIndices', () => {
  let httpMock: { get: jest.Mock };

  beforeEach(() => {
    httpMock = {
      get: jest.fn(),
    };

    (useAppContext as jest.Mock).mockReturnValue({ http: httpMock });
  });

  it('should return true if response is ok and has indices', async () => {
    httpMock.get.mockResolvedValue({ ok: true, hasIndices: true });

    const { result } = renderHook(() => useIndices());

    act(() => {
      result.current().then((res: any) => {
        expect(res.hasIndices).toBe(true);
      });
    });

    await waitFor(() => expect(httpMock.get).toHaveBeenCalled());
  });

  it('should return false if response is ok and has indices', async () => {
    httpMock.get.mockResolvedValue({ ok: true, hasIndices: false });

    const { result } = renderHook(() => useIndices());

    act(() => {
      result.current().then((res: any) => {
        expect(res.hasIndices).toBe(false);
      });
    });

    await waitFor(() => expect(httpMock.get).toHaveBeenCalled());
  });

  it('should return hasIndices as false when API response is not ok', async () => {
    httpMock.get.mockResolvedValue({ ok: false, err: { msg: 'Error message' } });

    const { result } = renderHook(() => useIndices());

    act(() => {
      result.current().then((res: any) => {
        expect(res.hasIndices).toBe(false);
      });
    });

    await waitFor(() => expect(httpMock.get).toHaveBeenCalled());
  });

  it('should throw an error when the API call fails', async () => {
    httpMock.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useIndices());

    await expect(result.current()).rejects.toThrow('Error fetching indices:');
  });
});

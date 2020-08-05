/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUpdateCases, UseUpdateCases } from './use_bulk_update_case';
import { basicCase } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useUpdateCases', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCases>(() =>
        useUpdateCases()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        isUpdated: false,
        updateBulkStatus: result.current.updateBulkStatus,
        dispatchResetIsUpdated: result.current.dispatchResetIsUpdated,
      });
    });
  });

  it('calls patchCase with correct arguments', async () => {
    const spyOnPatchCases = jest.spyOn(api, 'patchCasesStatus');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCases>(() =>
        useUpdateCases()
      );
      await waitForNextUpdate();

      result.current.updateBulkStatus([basicCase], 'closed');
      await waitForNextUpdate();
      expect(spyOnPatchCases).toBeCalledWith(
        [
          {
            status: 'closed',
            id: basicCase.id,
            version: basicCase.version,
          },
        ],
        abortCtrl.signal
      );
    });
  });

  it('patch cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCases>(() =>
        useUpdateCases()
      );
      await waitForNextUpdate();
      result.current.updateBulkStatus([basicCase], 'closed');
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isUpdated: true,
        isLoading: false,
        isError: false,
        updateBulkStatus: result.current.updateBulkStatus,
        dispatchResetIsUpdated: result.current.dispatchResetIsUpdated,
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCases>(() =>
        useUpdateCases()
      );
      await waitForNextUpdate();
      result.current.updateBulkStatus([basicCase], 'closed');

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('dispatchResetIsUpdated resets is updated', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCases>(() =>
        useUpdateCases()
      );

      await waitForNextUpdate();
      result.current.updateBulkStatus([basicCase], 'closed');
      await waitForNextUpdate();
      expect(result.current.isUpdated).toBeTruthy();
      result.current.dispatchResetIsUpdated();
      expect(result.current.isUpdated).toBeFalsy();
    });
  });

  it('unhappy path', async () => {
    const spyOnPatchCases = jest.spyOn(api, 'patchCasesStatus');
    spyOnPatchCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCases>(() =>
        useUpdateCases()
      );
      await waitForNextUpdate();
      result.current.updateBulkStatus([basicCase], 'closed');

      expect(result.current).toEqual({
        isUpdated: false,
        isLoading: false,
        isError: true,
        updateBulkStatus: result.current.updateBulkStatus,
        dispatchResetIsUpdated: result.current.dispatchResetIsUpdated,
      });
    });
  });
});

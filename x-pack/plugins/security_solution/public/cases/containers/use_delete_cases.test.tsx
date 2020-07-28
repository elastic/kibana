/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useDeleteCases, UseDeleteCase } from './use_delete_cases';
import * as api from './api';

jest.mock('./api');

describe('useDeleteCases', () => {
  const abortCtrl = new AbortController();
  const deleteObj = [{ id: '1' }, { id: '2' }, { id: '3' }];
  const deleteArr = ['1', '2', '3'];
  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteCase>(() =>
        useDeleteCases()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isDisplayConfirmDeleteModal: false,
        isLoading: false,
        isError: false,
        isDeleted: false,
        dispatchResetIsDeleted: result.current.dispatchResetIsDeleted,
        handleOnDeleteConfirm: result.current.handleOnDeleteConfirm,
        handleToggleModal: result.current.handleToggleModal,
      });
    });
  });

  it('calls deleteCases with correct arguments', async () => {
    const spyOnDeleteCases = jest.spyOn(api, 'deleteCases');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteCase>(() =>
        useDeleteCases()
      );
      await waitForNextUpdate();

      result.current.handleOnDeleteConfirm(deleteObj);
      await waitForNextUpdate();
      expect(spyOnDeleteCases).toBeCalledWith(deleteArr, abortCtrl.signal);
    });
  });

  it('deletes cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteCase>(() =>
        useDeleteCases()
      );
      await waitForNextUpdate();
      result.current.handleToggleModal();
      result.current.handleOnDeleteConfirm(deleteObj);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isDisplayConfirmDeleteModal: false,
        isLoading: false,
        isError: false,
        isDeleted: true,
        dispatchResetIsDeleted: result.current.dispatchResetIsDeleted,
        handleOnDeleteConfirm: result.current.handleOnDeleteConfirm,
        handleToggleModal: result.current.handleToggleModal,
      });
    });
  });

  it('resets is deleting', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteCase>(() =>
        useDeleteCases()
      );
      await waitForNextUpdate();
      result.current.handleToggleModal();
      result.current.handleOnDeleteConfirm(deleteObj);
      await waitForNextUpdate();
      expect(result.current.isDeleted).toBeTruthy();
      result.current.handleToggleModal();
      result.current.dispatchResetIsDeleted();
      expect(result.current.isDeleted).toBeFalsy();
    });
  });

  it('set isLoading to true when deleting cases', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteCase>(() =>
        useDeleteCases()
      );
      await waitForNextUpdate();
      result.current.handleToggleModal();
      result.current.handleOnDeleteConfirm(deleteObj);
      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnDeleteCases = jest.spyOn(api, 'deleteCases');
    spyOnDeleteCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseDeleteCase>(() =>
        useDeleteCases()
      );
      await waitForNextUpdate();
      result.current.handleToggleModal();
      result.current.handleOnDeleteConfirm(deleteObj);

      expect(result.current).toEqual({
        isDisplayConfirmDeleteModal: false,
        isLoading: false,
        isError: true,
        isDeleted: false,
        dispatchResetIsDeleted: result.current.dispatchResetIsDeleted,
        handleOnDeleteConfirm: result.current.handleOnDeleteConfirm,
        handleToggleModal: result.current.handleToggleModal,
      });
    });
  });
});

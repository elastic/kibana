/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { UseUpdateCase } from './use_update_case';
import { useUpdateCase } from './use_update_case';
import { basicCase } from './mock';
import * as api from './api';
import type { UpdateKey } from './types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

describe('useUpdateCase', () => {
  const abortCtrl = new AbortController();
  const updateKey: UpdateKey = 'description';
  const onSuccess = jest.fn();
  const onError = jest.fn();

  const sampleUpdate = {
    updateKey,
    updateValue: 'updated description',
    caseData: basicCase,
    onSuccess,
    onError,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        updateKey: null,
        updateCaseProperty: result.current.updateCaseProperty,
      });
    });
  });

  it('calls patchCase with correct arguments', async () => {
    const spyOnPatchCase = jest.spyOn(api, 'patchCase');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase()
      );
      await waitForNextUpdate();

      result.current.updateCaseProperty(sampleUpdate);
      await waitForNextUpdate();
      expect(spyOnPatchCase).toBeCalledWith(
        basicCase.id,
        { description: 'updated description' },
        basicCase.version,
        abortCtrl.signal
      );
    });
  });

  it('patch case and refresh the case page', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase()
      );
      await waitForNextUpdate();
      result.current.updateCaseProperty(sampleUpdate);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        updateKey: null,
        isLoading: false,
        isError: false,
        updateCaseProperty: result.current.updateCaseProperty,
      });
      expect(useRefreshCaseViewPage()).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase()
      );
      await waitForNextUpdate();
      result.current.updateCaseProperty(sampleUpdate);

      expect(result.current.isLoading).toBe(true);
      expect(result.current.updateKey).toBe(updateKey);
    });
  });

  it('unhappy path', async () => {
    const spyOnPatchCase = jest.spyOn(api, 'patchCase');
    spyOnPatchCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase()
      );
      await waitForNextUpdate();
      result.current.updateCaseProperty(sampleUpdate);

      expect(result.current).toEqual({
        updateKey: null,
        isLoading: false,
        isError: true,
        updateCaseProperty: result.current.updateCaseProperty,
      });
      expect(onError).toHaveBeenCalled();
    });
  });
});

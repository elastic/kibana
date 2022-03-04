/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUpdateCase, UseUpdateCase } from './use_update_case';
import { basicCase } from './mock';
import * as api from './api';
import { UpdateKey } from './types';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useUpdateCase', () => {
  const abortCtrl = new AbortController();
  const fetchCaseUserActions = jest.fn();
  const updateCase = jest.fn();
  const updateKey: UpdateKey = 'description';
  const onSuccess = jest.fn();
  const onError = jest.fn();

  const sampleUpdate = {
    fetchCaseUserActions,
    updateKey,
    updateValue: 'updated description',
    updateCase,
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
        useUpdateCase({ caseId: basicCase.id })
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
        useUpdateCase({ caseId: basicCase.id })
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

  it('patch case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase({ caseId: basicCase.id })
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
      expect(fetchCaseUserActions).toBeCalledWith(basicCase.id, 'none');
      expect(updateCase).toBeCalledWith(basicCase);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseUpdateCase>(() =>
        useUpdateCase({ caseId: basicCase.id })
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
        useUpdateCase({ caseId: basicCase.id })
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

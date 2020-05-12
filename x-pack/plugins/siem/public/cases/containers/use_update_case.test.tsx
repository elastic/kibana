/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useUpdateCase, UseUpdateCase, UpdateKey } from './use_update_case';
import { basicCase } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useUpdateCase', () => {
  const abortCtrl = new AbortController();
  const fetchCaseUserActions = jest.fn();
  const updateCase = jest.fn();
  const updateKey: UpdateKey = 'description';
  const sampleUpdate = {
    fetchCaseUserActions,
    updateKey,
    updateValue: 'updated description',
    updateCase,
    version: basicCase.version,
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
      expect(fetchCaseUserActions).toBeCalledWith(basicCase.id);
      expect(updateCase).toBeCalledWith(basicCase);
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
    });
  });
});

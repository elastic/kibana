/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import {
  initialData,
  useGetCaseUserActions,
  UseGetCaseUserActions,
} from './use_get_case_user_actions';
import { basicCaseId, caseUserActions, elasticUser } from './mock';
import * as api from './api';

jest.mock('./api');

describe('useGetCaseUserActions', () => {
  const abortCtrl = new AbortController();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCaseId)
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialData,
        fetchCaseUserActions: result.current.fetchCaseUserActions,
      });
    });
  });

  it('calls getCaseUserActions with correct arguments', async () => {
    const spyOnPostCase = jest.spyOn(api, 'getCaseUserActions');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCaseId)
      );
      await waitForNextUpdate();

      result.current.fetchCaseUserActions(basicCaseId);
      await waitForNextUpdate();
      expect(spyOnPostCase).toBeCalledWith(basicCaseId, abortCtrl.signal);
    });
  });

  it('retuns proper state on getCaseUserActions', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCaseId)
      );
      await waitForNextUpdate();
      result.current.fetchCaseUserActions(basicCaseId);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        ...initialData,
        caseUserActions: caseUserActions.slice(1),
        fetchCaseUserActions: result.current.fetchCaseUserActions,
        hasDataToPush: true,
        isError: false,
        isLoading: false,
        participants: [elasticUser],
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCaseId)
      );
      await waitForNextUpdate();
      result.current.fetchCaseUserActions(basicCaseId);

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnPostCase = jest.spyOn(api, 'getCaseUserActions');
    spyOnPostCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseGetCaseUserActions>(() =>
        useGetCaseUserActions(basicCaseId)
      );
      await waitForNextUpdate();
      result.current.fetchCaseUserActions(basicCaseId);

      expect(result.current).toEqual({
        ...initialData,
        isLoading: false,
        isError: true,
        fetchCaseUserActions: result.current.fetchCaseUserActions,
      });
    });
  });
});

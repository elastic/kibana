/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { usePostCase, UsePostCase } from './use_post_case';
import * as api from './api';
import { ConnectorTypes } from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { basicCasePost } from './mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('usePostCase', () => {
  const abortCtrl = new AbortController();
  const samplePost = {
    description: 'description',
    tags: ['tags'],
    title: 'title',
    connector: {
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
      fields: null,
    },
    settings: {
      syncAlerts: true,
    },
    owner: SECURITY_SOLUTION_OWNER,
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostCase>(() => usePostCase());
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        postCase: result.current.postCase,
      });
    });
  });

  it('calls postCase with correct arguments', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postCase');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostCase>(() => usePostCase());
      await waitForNextUpdate();

      result.current.postCase(samplePost);
      await waitForNextUpdate();
      expect(spyOnPostCase).toBeCalledWith(samplePost, abortCtrl.signal);
    });
  });

  it('calls postCase with correct result', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostCase>(() => usePostCase());
      await waitForNextUpdate();

      const postData = await result.current.postCase(samplePost);
      expect(postData).toEqual(basicCasePost);
    });
  });

  it('post case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostCase>(() => usePostCase());
      await waitForNextUpdate();
      result.current.postCase(samplePost);
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        postCase: result.current.postCase,
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostCase>(() => usePostCase());
      await waitForNextUpdate();
      result.current.postCase(samplePost);

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('unhappy path', async () => {
    const spyOnPostCase = jest.spyOn(api, 'postCase');
    spyOnPostCase.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UsePostCase>(() => usePostCase());
      await waitForNextUpdate();
      result.current.postCase(samplePost);

      expect(result.current).toEqual({
        isLoading: false,
        isError: true,
        postCase: result.current.postCase,
      });
    });
  });
});

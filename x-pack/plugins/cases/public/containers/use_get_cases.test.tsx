/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { DEFAULT_FILTER_OPTIONS, DEFAULT_QUERY_PARAMS, useGetCases } from './use_get_cases';
import * as api from './api';
import { AppMockRenderer, createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

describe('useGetCases', () => {
  const abortCtrl = new AbortController();
  const addSuccess = jest.fn();
  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError: jest.fn() });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls getCases with correct arguments', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });
    await waitFor(() => {
      expect(spyOnGetCases).toBeCalledWith({
        filterOptions: { ...DEFAULT_FILTER_OPTIONS },
        queryParams: DEFAULT_QUERY_PARAMS,
        signal: abortCtrl.signal,
      });
    });
  });

  it('shows a toast error message when an error occurs in the response', async () => {
    const spyOnGetCases = jest.spyOn(api, 'getCases');
    spyOnGetCases.mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

    renderHook(() => useGetCases(), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitFor(() => {
      expect(addError).toHaveBeenCalled();
    });
  });
});

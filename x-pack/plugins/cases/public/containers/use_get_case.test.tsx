/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useGetCase } from './use_get_case';
import * as api from './api';
import { waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const wrapper: React.FC<string> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('Use get case hook', () => {
  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'resolveCase');
    const { waitForNextUpdate } = renderHook(() => useGetCase('case-1'), { wrapper });
    await waitForNextUpdate();
    expect(spy).toHaveBeenCalledWith({
      caseId: 'case-1',
      includeComments: true,
      signal: expect.any(AbortSignal),
    });
  });

  it('shows a toast error when the api return an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });
    const spy = jest.spyOn(api, 'resolveCase').mockRejectedValue(new Error("C'est la vie"));
    const { waitForNextUpdate } = renderHook(() => useGetCase('case-1'), { wrapper });
    await waitForNextUpdate();
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({
        caseId: 'case-1',
        includeComments: true,
        signal: expect.any(AbortSignal),
      });
      expect(addError).toHaveBeenCalled();
    });
  });
});

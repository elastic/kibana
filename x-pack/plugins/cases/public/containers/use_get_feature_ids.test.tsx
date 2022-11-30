/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/dom';
import { useToasts } from '../common/lib/kibana';
import { useGetFeatureIds } from './use_get_feature_ids';
import * as api from './api';

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

describe('useGetFeaturesIds', () => {
  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'getFeatureIds');
    const { waitForNextUpdate } = renderHook(() => useGetFeatureIds(['context1']), { wrapper });
    await waitForNextUpdate();
    expect(spy).toHaveBeenCalledWith(
      { registrationContext: ['context1'] },
      expect.any(AbortSignal)
    );
  });

  it('shows a toast error when the api return an error', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });
    const spy = jest
      .spyOn(api, 'getFeatureIds')
      .mockRejectedValue(new Error('Something went wrong'));
    const { waitForNextUpdate } = renderHook(() => useGetFeatureIds(['context1']), { wrapper });
    await waitForNextUpdate();
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        { registrationContext: ['context1'] },
        expect.any(AbortSignal)
      );
      expect(addError).toHaveBeenCalled();
    });
  });
});

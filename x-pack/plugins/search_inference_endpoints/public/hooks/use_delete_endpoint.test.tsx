/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from './use_kibana';
import { useDeleteEndpoint } from './use_delete_endpoint';
import * as i18n from './translations';
import React from 'react';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockDelete = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

describe('useDeleteEndpoint', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          delete: mockDelete,
        },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
          },
        },
      },
    });
    mockDelete.mockResolvedValue({});
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('should call delete endpoint and show success toast on success', async () => {
    const { result, waitFor } = renderHook(() => useDeleteEndpoint(), { wrapper });

    result.current.mutate({ type: 'text_embedding', id: 'in-1' });

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        '/internal/inference_endpoint/endpoints/text_embedding/in-1'
      )
    );
    expect(mockAddSuccess).toHaveBeenCalledWith({
      title: i18n.DELETE_SUCCESS,
    });
  });

  it('should show error toast on failure', async () => {
    const error = new Error('Deletion failed');
    mockDelete.mockRejectedValue(error);
    const { result, waitFor } = renderHook(() => useDeleteEndpoint(), { wrapper });

    result.current.mutate({ type: 'model', id: '123' });

    await waitFor(() => expect(mockAddError).toHaveBeenCalled());
    expect(mockAddError).toHaveBeenCalledWith(error, {
      title: i18n.ENDPOINT_DELETION_FAILED,
    });
  });
});

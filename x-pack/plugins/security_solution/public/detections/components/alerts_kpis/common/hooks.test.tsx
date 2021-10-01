/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useInspectButton, UseInspectButtonParams } from './hooks';

describe('hooks', () => {
  describe('useInspectButton', () => {
    const defaultParams: UseInspectButtonParams = {
      setQuery: jest.fn(),
      response: '',
      request: '',
      refetch: jest.fn(),
      uniqueQueryId: 'test-uniqueQueryId',
      deleteQuery: jest.fn(),
      loading: false,
    };

    it('calls setQuery when rendering', () => {
      const mockSetQuery = jest.fn();

      renderHook(() => useInspectButton({ ...defaultParams, setQuery: mockSetQuery }));

      expect(mockSetQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          id: defaultParams.uniqueQueryId,
        })
      );
    });

    it('calls deleteQuery when unmounting', () => {
      const mockDeleteQuery = jest.fn();

      const result = renderHook(() =>
        useInspectButton({ ...defaultParams, deleteQuery: mockDeleteQuery })
      );
      result.unmount();

      expect(mockDeleteQuery).toHaveBeenCalledWith({ id: defaultParams.uniqueQueryId });
    });
  });
});

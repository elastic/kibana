/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import {
  getAggregatableFields,
  useInspectButton,
  UseInspectButtonParams,
  useStackByFields,
} from './hooks';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { TestProviders } from '../../../../common/mock';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

test('getAggregatableFields', () => {
  expect(getAggregatableFields(mockBrowserFields)).toMatchSnapshot();
});

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

  describe('useStackByFields', () => {
    jest.mock('../../../../common/containers/sourcerer', () => ({
      useSourcererDataView: jest.fn().mockReturnValue({ browserFields: mockBrowserFields }),
    }));
    it('returns only aggregateable fields', () => {
      const wrapper = ({ children }: { children: JSX.Element }) => (
        <TestProviders>{children}</TestProviders>
      );
      const { result, unmount } = renderHook(() => useStackByFields(), { wrapper });
      const aggregateableFields = result.current;
      unmount();
      expect(aggregateableFields?.find((field) => field.label === 'agent.id')).toBeTruthy();
      expect(
        aggregateableFields?.find((field) => field.label === 'nestedField.firstAttributes')
      ).toBe(undefined);
    });
  });
});

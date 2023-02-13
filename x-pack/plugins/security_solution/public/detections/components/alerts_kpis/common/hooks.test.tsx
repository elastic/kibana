/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import type { UseInspectButtonParams } from './hooks';
import { getAggregatableFields, useInspectButton, useStackByFields } from './hooks';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { TestProviders } from '../../../../common/mock';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});
jest.mock('../../../../common/containers/sourcerer', () => ({
  useSourcererDataView: jest.fn(),
  getScopeFromPath: jest.fn(),
}));

test('getAggregatableFields', () => {
  expect(getAggregatableFields(mockBrowserFields)).toMatchSnapshot();
});

test('getAggregatableFields when useLensCompatibleFields = true', () => {
  const useLensCompatibleFields = true;
  expect(
    getAggregatableFields({ base: mockBrowserFields.base }, useLensCompatibleFields)
  ).toHaveLength(0);
});

describe('hooks', () => {
  const mockUseSourcererDataView = useSourcererDataView as jest.Mock;

  describe('useInspectButton', () => {
    beforeEach(() => {
      mockUseSourcererDataView.mockReturnValue({
        browserFields: mockBrowserFields,
      });

      jest.clearAllMocks();
    });

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
    beforeEach(() => {
      mockUseSourcererDataView.mockReturnValue({
        browserFields: mockBrowserFields,
      });

      jest.clearAllMocks();
    });
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

    it('returns only Lens compatible fields (check if one of esTypes is keyword)', () => {
      mockUseSourcererDataView.mockReturnValue({
        browserFields: { base: mockBrowserFields.base },
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <TestProviders>{children}</TestProviders>
      );
      const useLensCompatibleFields = true;
      const { result, unmount } = renderHook(() => useStackByFields(useLensCompatibleFields), {
        wrapper,
      });
      const aggregateableFields = result.current;
      unmount();
      expect(aggregateableFields?.find((field) => field.label === '@timestamp')).toBeUndefined();
      expect(aggregateableFields?.find((field) => field.label === '_id')).toBeUndefined();
    });

    it('returns only Lens compatible fields (check if it is a nested field)', () => {
      mockUseSourcererDataView.mockReturnValue({
        browserFields: { nestedField: mockBrowserFields.nestedField },
      });

      const wrapper = ({ children }: { children: JSX.Element }) => (
        <TestProviders>{children}</TestProviders>
      );
      const useLensCompatibleFields = true;
      const { result, unmount } = renderHook(() => useStackByFields(useLensCompatibleFields), {
        wrapper,
      });
      const aggregateableFields = result.current;
      unmount();
      expect(aggregateableFields).toHaveLength(0);
    });
  });
});

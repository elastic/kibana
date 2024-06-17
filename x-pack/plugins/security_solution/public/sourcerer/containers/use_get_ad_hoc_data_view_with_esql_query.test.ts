/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';
import { getESQLAdHocDataViewForSecuritySolution } from './helpers';
import { useGetAdHocDataViewWithESQLQuery } from './use_get_ad_hoc_data_view_with_esql_query';

jest.mock('./helpers', () => {
  return {
    ...jest.requireActual('./helpers'),
    getESQLAdHocDataViewForSecuritySolution: jest.fn(),
  };
});

const mockDataViewWithTimestamp = {
  fields: {
    getByName: jest.fn().mockReturnValue({ type: 'date' }),
  },
};

const mockDataViewService = {
  ...dataViewPluginMocks.createStartContract(),
};

describe('useGetAdHocDataViewWithESQLQuery', () => {
  beforeEach(() => {
    (getESQLAdHocDataViewForSecuritySolution as jest.Mock).mockResolvedValue(
      mockDataViewWithTimestamp
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when query is invalid or it does not have FROM source-command', () => {
    const invalidQuery = {
      esql: 'invalid query',
    };
    test('should return undefined dataView', async () => {
      const { result } = renderHook(() =>
        useGetAdHocDataViewWithESQLQuery({
          query: invalidQuery,
          dataViews: mockDataViewService,
        })
      );

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.getDataView();
      });

      expect(result.current.dataView).toBeUndefined();
    });

    test('should have correct loading states', async () => {
      const { result } = renderHook(() =>
        useGetAdHocDataViewWithESQLQuery({
          query: invalidQuery,
          dataViews: mockDataViewService,
        })
      );

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.getDataView();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.dataView).toBeUndefined();
    });
  });

  describe('when query is valid', () => {
    const query = {
      esql: 'from indexPattern*',
    };
    test('should return dataView correctly', async () => {
      const { result } = renderHook(() =>
        useGetAdHocDataViewWithESQLQuery({
          query,
          dataViews: mockDataViewService,
        })
      );

      await act(async () => {
        const { getDataView } = result.current;
        await getDataView();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.dataView).not.toBeUndefined();
    });

    test('should update getDataView handler when only indexPattern changes', async () => {
      let esqlQuery = query;
      const { result, rerender } = renderHook(
        () =>
          useGetAdHocDataViewWithESQLQuery({
            query: esqlQuery,
            dataViews: mockDataViewService,
          }),
        {
          initialProps: { query },
        }
      );

      const initialGetDataView = result.current.getDataView;

      expect(result.current.getDataView === initialGetDataView).toBe(true);

      esqlQuery = {
        esql: 'from new_indexPattern*',
      };

      rerender();

      await waitFor(() => {
        expect(result.current.getDataView === initialGetDataView).toBe(false);
      });
    });

    test('should not update getDataView handler when indexPattern does not change but query changes', async () => {
      let esqlQuery = query;
      const { result, rerender } = renderHook(
        () =>
          useGetAdHocDataViewWithESQLQuery({
            query: esqlQuery,
            dataViews: mockDataViewService,
          }),
        {
          initialProps: { query },
        }
      );

      const initialGetDataView = result.current.getDataView;

      expect(result.current.getDataView === initialGetDataView).toBe(true);

      esqlQuery = {
        esql: `${query.esql} | limit 10`,
      };

      rerender();

      await waitFor(() => {
        expect(result.current.getDataView === initialGetDataView).toBe(true);
      });
    });
  });
});

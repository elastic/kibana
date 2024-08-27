/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useIndicators, UseIndicatorsParams, UseIndicatorsValue } from './use_indicators';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { createFetchIndicators } from '../services/fetch_indicators';
import { mockTimeRange } from '../../../mocks/mock_indicators_filters_context';

jest.mock('../services/fetch_indicators');

const useIndicatorsParams: UseIndicatorsParams = {
  filters: [],
  filterQuery: { query: '', language: 'kuery' },
  sorting: [],
  timeRange: mockTimeRange,
};

const indicatorsQueryResult = { indicators: [], total: 0 };

const renderUseIndicators = (initialProps = useIndicatorsParams) =>
  renderHook<UseIndicatorsParams, UseIndicatorsValue>((props) => useIndicators(props), {
    initialProps,
    wrapper: TestProvidersComponent,
  });

describe('useIndicators()', () => {
  type MockedCreateFetchIndicators = jest.MockedFunction<typeof createFetchIndicators>;
  let indicatorsQuery: jest.MockedFunction<ReturnType<typeof createFetchIndicators>>;

  beforeEach(jest.clearAllMocks);

  beforeEach(() => {
    indicatorsQuery = jest.fn();
    (createFetchIndicators as MockedCreateFetchIndicators).mockReturnValue(indicatorsQuery);
  });

  describe('when mounted', () => {
    it('should create and call the indicatorsQuery', async () => {
      indicatorsQuery.mockResolvedValue(indicatorsQueryResult);

      const hookResult = renderUseIndicators();

      // isLoading should be true
      expect(hookResult.result.current.isLoading).toEqual(true);

      // indicators service and the query should be called just once
      expect(createFetchIndicators as MockedCreateFetchIndicators).toHaveBeenCalledTimes(1);
      expect(indicatorsQuery).toHaveBeenCalledTimes(1);

      // isLoading should turn to false eventually
      await hookResult.waitFor(() => !hookResult.result.current.isLoading);
      expect(hookResult.result.current.isLoading).toEqual(false);
    });
  });

  describe('when inputs change', () => {
    it('should query the database again and reset page to 0', async () => {
      const hookResult = renderUseIndicators();
      expect(indicatorsQuery).toHaveBeenCalledTimes(1);

      // Change page
      await act(async () => hookResult.result.current.onChangePage(42));

      expect(indicatorsQuery).toHaveBeenCalledTimes(2);
      expect(indicatorsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 42 }),
        }),
        expect.any(AbortSignal)
      );

      // Change page size
      await act(async () => hookResult.result.current.onChangeItemsPerPage(50));

      expect(indicatorsQuery).toHaveBeenCalledTimes(3);
      expect(indicatorsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 0, pageSize: 50 }),
        }),
        expect.any(AbortSignal)
      );

      // Change filters
      act(() =>
        hookResult.rerender({
          ...useIndicatorsParams,
          filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
        })
      );

      expect(indicatorsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pageIndex: 0 }),
          filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
        }),
        expect.any(AbortSignal)
      );

      await hookResult.waitFor(() => !hookResult.result.current.isLoading);

      expect(hookResult.result.current).toMatchInlineSnapshot(`
        Object {
          "dataUpdatedAt": 0,
          "indicatorCount": 0,
          "indicators": Array [],
          "isFetching": false,
          "isLoading": false,
          "onChangeItemsPerPage": [Function],
          "onChangePage": [Function],
          "pagination": Object {
            "pageIndex": 0,
            "pageSize": 50,
            "pageSizeOptions": Array [
              10,
              25,
              50,
            ],
          },
          "query": Object {
            "id": "indicatorsTable",
            "loading": false,
            "refetch": [Function],
          },
        }
      `);
    });
  });
});

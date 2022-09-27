/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useAggregatedIndicators, UseAggregatedIndicatorsParam } from './use_aggregated_indicators';
import { DEFAULT_TIME_RANGE } from '../../query_bar/hooks/use_filters/utils';
import {
  mockedTimefilterService,
  TestProvidersComponent,
} from '../../../common/mocks/test_providers';
import { useFilters } from '../../query_bar/hooks/use_filters';
import { createFetchAggregatedIndicators } from '../services/fetch_aggregated_indicators';

jest.mock('../services/fetch_aggregated_indicators');
jest.mock('../../query_bar/hooks/use_filters');

const useAggregatedIndicatorsParams: UseAggregatedIndicatorsParam = {
  timeRange: DEFAULT_TIME_RANGE,
};

const stub = () => {};

const renderUseAggregatedIndicators = () =>
  renderHook((props) => useAggregatedIndicators(props), {
    initialProps: useAggregatedIndicatorsParams,
    wrapper: TestProvidersComponent,
  });

const initialFiltersValue = {
  filters: [],
  filterQuery: { language: 'kuery', query: '' },
  filterManager: {} as any,
  handleSavedQuery: stub,
  handleSubmitQuery: stub,
  handleSubmitTimeRange: stub,
};

describe('useAggregatedIndicators()', () => {
  beforeEach(jest.clearAllMocks);

  type MockedCreateFetchAggregatedIndicators = jest.MockedFunction<
    typeof createFetchAggregatedIndicators
  >;
  let aggregatedIndicatorsQuery: jest.MockedFunction<
    ReturnType<typeof createFetchAggregatedIndicators>
  >;

  beforeEach(jest.clearAllMocks);

  beforeEach(() => {
    aggregatedIndicatorsQuery = jest.fn();
    (createFetchAggregatedIndicators as MockedCreateFetchAggregatedIndicators).mockReturnValue(
      aggregatedIndicatorsQuery
    );

    (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue(initialFiltersValue);
  });

  it('should create and call the aggregatedIndicatorsQuery correctly', async () => {
    aggregatedIndicatorsQuery.mockResolvedValue([]);

    const { rerender } = renderUseAggregatedIndicators();

    // indicators service and the query should be called just once
    expect(
      createFetchAggregatedIndicators as MockedCreateFetchAggregatedIndicators
    ).toHaveBeenCalledTimes(1);
    expect(aggregatedIndicatorsQuery).toHaveBeenCalledTimes(1);

    // Ensure the timefilter service is called
    expect(mockedTimefilterService.timefilter.calculateBounds).toHaveBeenCalled();
    // Call the query function
    expect(aggregatedIndicatorsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filterQuery: { language: 'kuery', query: '' },
      }),
      expect.any(AbortSignal)
    );

    // After filter values change, the hook will be re-rendered and should call the query function again, with
    // updated values
    (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue({
      ...initialFiltersValue,
      filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
    });

    await act(async () => rerender());

    expect(aggregatedIndicatorsQuery).toHaveBeenCalledTimes(2);
    expect(aggregatedIndicatorsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        filterQuery: { language: 'kuery', query: "threat.indicator.type: 'file'" },
      }),
      expect.any(AbortSignal)
    );
  });
});

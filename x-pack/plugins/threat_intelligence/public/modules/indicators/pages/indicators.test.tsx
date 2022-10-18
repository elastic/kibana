/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorsPage } from '.';
import { useAggregatedIndicators, useIndicators } from '../hooks';
import { useFilters } from '../../query_bar/hooks/use_filters';
import moment from 'moment';
import { TestProvidersComponent } from '../../../common/mocks/test_providers';
import { TABLE_TEST_ID } from '../components/table';
import { mockTimeRange } from '../../../common/mocks/mock_indicators_filters_context';

jest.mock('../../query_bar/hooks/use_filters');
jest.mock('../hooks/use_indicators');
jest.mock('../hooks/use_aggregated_indicators');

const stub = () => {};

describe('<IndicatorsPage />', () => {
  beforeAll(() => {
    (
      useAggregatedIndicators as jest.MockedFunction<typeof useAggregatedIndicators>
    ).mockReturnValue({
      dateRange: { min: moment(), max: moment() },
      series: [],
      selectedField: '',
      onFieldChange: () => {},
    });

    (useIndicators as jest.MockedFunction<typeof useIndicators>).mockReturnValue({
      indicators: [{ fields: {} }],
      indicatorCount: 1,
      isLoading: false,
      isFetching: false,
      pagination: { pageIndex: 0, pageSize: 10, pageSizeOptions: [10] },
      onChangeItemsPerPage: stub,
      onChangePage: stub,
      handleRefresh: stub,
      dataUpdatedAt: Date.now(),
    });

    (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      filterManager: {} as any,
      timeRange: mockTimeRange,
    });
  });

  it('should render the table', () => {
    const { queryByTestId } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });

    expect(queryByTestId(TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render SIEM Search Bar', () => {
    const { queryByTestId } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });
    expect(queryByTestId('SiemSearchBar')).toBeInTheDocument();
  });

  it('should render stack by selector', () => {
    const { queryByText } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });
    expect(queryByText('Stack by')).toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { IndicatorsPage } from './indicators_page';
import { useIndicators } from './hooks/use_indicators';
import { useAggregatedIndicators } from './hooks/use_aggregated_indicators';
import { useFilters } from '../query_bar/hooks/use_filters';
import moment from 'moment';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { TABLE_TEST_ID } from './components/indicators_table';

jest.mock('../query_bar/hooks/use_filters');
jest.mock('./hooks/use_indicators');
jest.mock('./hooks/use_aggregated_indicators');

const stub = () => {};

describe('<IndicatorsPage />', () => {
  beforeAll(() => {
    (
      useAggregatedIndicators as jest.MockedFunction<typeof useAggregatedIndicators>
    ).mockReturnValue({
      dateRange: { min: moment(), max: moment() },
      indicators: [],
      selectedField: '',
      onFieldChange: () => {},
    });

    (useIndicators as jest.MockedFunction<typeof useIndicators>).mockReturnValue({
      indicators: [{ fields: {} }],
      indicatorCount: 1,
      loading: false,
      pagination: { pageIndex: 0, pageSize: 10, pageSizeOptions: [10] },
      onChangeItemsPerPage: stub,
      onChangePage: stub,
      handleRefresh: stub,
    });

    (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue({
      filters: [],
      filterQuery: { language: 'kuery', query: '' },
      filterManager: {} as any,
      handleSavedQuery: stub,
      handleSubmitQuery: stub,
      handleSubmitTimeRange: stub,
    });
  });

  it('should render the table', () => {
    const { queryByTestId } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });

    expect(queryByTestId(TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render the query input', () => {
    const { queryByTestId } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });
    expect(queryByTestId('iocListPageQueryInput')).toBeInTheDocument();
  });

  it('should render stack by selector', () => {
    const { queryByText } = render(<IndicatorsPage />, { wrapper: TestProvidersComponent });
    expect(queryByText('Stack by')).toBeInTheDocument();
  });
});

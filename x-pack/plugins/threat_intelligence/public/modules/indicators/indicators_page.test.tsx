/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvidersComponent } from '../../common/mocks/test_providers';
import { IndicatorsPage } from './indicators_page';
import { useIndicators } from './hooks/use_indicators';
import { useIndicatorsTotalCount } from './hooks/use_indicators_total_count';
import { TABLE_TEST_ID as INDICATORS_TABLE_TEST_ID } from './components/indicators_table/indicators_table';
import { EMPTY_PROMPT_TEST_ID } from '../../components/empty_page';

jest.mock('./hooks/use_indicators');
jest.mock('./hooks/use_indicators_total_count');
jest.mock('../../hooks/use_integrations_page_link');

const stub = () => {};

describe('<IndicatorsPage />', () => {
  beforeAll(() => {
    (useIndicators as jest.MockedFunction<typeof useIndicators>).mockReturnValue({
      indicators: [],
      indicatorCount: 0,
      firstLoad: false,
      pagination: { pageIndex: 0, pageSize: 10, pageSizeOptions: [10] },
      onChangeItemsPerPage: stub,
      onChangePage: stub,
      loadData: stub,
    });
  });

  it('should render the contents without crashing', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 10,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsPage />
      </TestProvidersComponent>
    );

    expect(getByTestId(INDICATORS_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty page when no indicators are found', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsPage />
      </TestProvidersComponent>
    );

    expect(getByTestId(EMPTY_PROMPT_TEST_ID)).toBeInTheDocument();
  });

  it('should render indicators table when count is being loaded', async () => {
    (
      useIndicatorsTotalCount as jest.MockedFunction<typeof useIndicatorsTotalCount>
    ).mockReturnValue({
      count: 0,
      isLoading: true,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsPage />
      </TestProvidersComponent>
    );

    expect(getByTestId(INDICATORS_TABLE_TEST_ID)).toBeInTheDocument();
  });
});

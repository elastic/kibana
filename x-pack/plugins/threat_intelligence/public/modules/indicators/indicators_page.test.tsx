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
import { TABLE_TEST_ID as INDICATORS_TABLE_TEST_ID } from './components/indicators_table/indicators_table';

jest.mock('./hooks/use_indicators');

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
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsPage />
      </TestProvidersComponent>
    );

    expect(getByTestId(INDICATORS_TABLE_TEST_ID)).toBeInTheDocument();
  });

  it('should render indicators table when count is being loaded', async () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsPage />
      </TestProvidersComponent>
    );

    expect(getByTestId(INDICATORS_TABLE_TEST_ID)).toBeInTheDocument();
  });
});

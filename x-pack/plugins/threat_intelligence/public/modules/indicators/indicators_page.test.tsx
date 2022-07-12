/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render } from '@testing-library/react';
import React from 'react';
import { IndicatorsPage } from './indicators_page';
import { useIndicators } from './hooks/use_indicators';
import { TestProvidersComponent } from '../../common/test_providers';

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
    await act(async () => {
      render(
        <TestProvidersComponent>
          <IndicatorsPage
            history={undefined as any}
            location={undefined as any}
            match={undefined as any}
          />
        </TestProvidersComponent>
      );
    });
  });
});

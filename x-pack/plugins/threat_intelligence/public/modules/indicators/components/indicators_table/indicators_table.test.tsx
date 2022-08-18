/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { IndicatorsTable, IndicatorsTableProps } from './indicators_table';
import { TestProvidersComponent } from '../../../../common/mocks/test_providers';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { BUTTON_TEST_ID } from '../open_indicator_flyout_button/open_indicator_flyout_button';
import { TITLE_TEST_ID } from '../indicators_flyout/indicators_flyout';

const stub = () => {};

const tableProps: IndicatorsTableProps = {
  onChangePage: stub,
  onChangeItemsPerPage: stub,
  indicators: [],
  pagination: { pageSize: 10, pageIndex: 0, pageSizeOptions: [10] },
  indicatorCount: 0,
  loading: false,
  indexPatterns: [],
};

const indicatorsFixture: Indicator[] = [
  {
    ...generateMockIndicator(),
    fields: {
      'threat.indicator.type': ['url'],
    },
  },
  {
    ...generateMockIndicator(),
    fields: {
      'threat.indicator.type': ['file'],
    },
  },
];

describe('<IndicatorsTable />', () => {
  it('should render loading spinner when loading', async () => {
    await act(async () => {
      render(
        <TestProvidersComponent>
          <IndicatorsTable {...tableProps} loading={true} />
        </TestProvidersComponent>
      );
    });

    expect(screen.queryByRole('progressbar')).toBeInTheDocument();
  });

  it('should render datagrid when loading is done', async () => {
    await act(async () => {
      render(
        <TestProvidersComponent>
          <IndicatorsTable
            {...tableProps}
            loading={false}
            indicatorCount={indicatorsFixture.length}
            indicators={indicatorsFixture}
          />
        </TestProvidersComponent>
      );
    });

    expect(screen.queryByRole('grid')).toBeInTheDocument();

    // Two rows should be rendered
    expect(screen.queryAllByTestId(BUTTON_TEST_ID).length).toEqual(2);

    await act(async () => {
      screen.getAllByTestId(BUTTON_TEST_ID)[0].click();
    });

    expect(screen.queryByTestId(TITLE_TEST_ID)).toBeInTheDocument();
  });
});

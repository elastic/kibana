/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { IndicatorsTable, IndicatorsTableProps } from './indicators_table';
import { TestProvidersComponent } from '../../../../common/test_providers';

const stub = () => {};

const tableProps: IndicatorsTableProps = {
  loadData: stub,
  onChangePage: stub,
  onChangeItemsPerPage: stub,
  indicators: [],
  pagination: { pageSize: 10, pageIndex: 0, pageSizeOptions: [10] },
  indicatorCount: 0,
  firstLoad: false,
};

const indicatorsFixture = [
  {
    fields: {
      'threat.indicator.type': ['url'],
    },
  },
  {
    fields: {
      'threat.indicator.type': ['file'],
    },
  },
];

describe('<IndicatorsTable />', () => {
  it('should render loading spinner on first load', async () => {
    await act(async () => {
      render(
        <TestProvidersComponent>
          <IndicatorsTable {...tableProps} firstLoad={true} />
        </TestProvidersComponent>
      );
    });

    expect(screen.queryByRole('progressbar')).toBeInTheDocument();
  });

  it('should render datagrid when first load is done', async () => {
    await act(async () => {
      render(
        <TestProvidersComponent>
          <IndicatorsTable
            {...tableProps}
            firstLoad={false}
            indicatorCount={indicatorsFixture.length}
            indicators={indicatorsFixture}
          />
        </TestProvidersComponent>
      );
    });

    expect(screen.queryByRole('grid')).toBeInTheDocument();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { mockAppDataView, mockDataView, mockUxSeries, render } from '../../rtl_helpers';
import { SelectedFilters } from './selected_filters';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { USER_AGENT_NAME } from '../../configurations/constants/elasticsearch_fieldnames';
import { obsvReportConfigMap } from '../../obsv_exploratory_view';

describe('SelectedFilters', function () {
  mockAppDataView();

  const dataViewSeries = getDefaultConfigs({
    reportType: 'data-distribution',
    dataView: mockDataView,
    dataType: 'ux',
    reportConfigMap: obsvReportConfigMap,
  });

  it('should render properly', async function () {
    const filters = [{ field: USER_AGENT_NAME, values: ['Chrome'] }];
    const initSeries = { filters };

    render(
      <SelectedFilters
        seriesId={0}
        seriesConfig={dataViewSeries}
        series={{ ...mockUxSeries, filters }}
      />,
      {
        initSeries,
      }
    );

    await waitFor(() => {
      screen.getByText('Chrome');
      screen.getByTitle('Filter: Browser family: Chrome. Select for more filter actions.');
    });
  });
});

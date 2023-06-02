/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { getDefaultConfigs } from '../../configurations/default_configs';
import {
  mockAppDataView,
  mockDataView,
  mockUseValuesList,
  mockUxSeries,
  render,
} from '../../rtl_helpers';
import { ReportDefinitionCol } from './report_definition_col';
import { obsvReportConfigMap } from '../../obsv_exploratory_view';

describe('Series Builder ReportDefinitionCol', function () {
  mockAppDataView();
  const seriesId = 0;

  const seriesConfig = getDefaultConfigs({
    reportType: 'data-distribution',
    dataView: mockDataView,
    dataType: 'ux',
    reportConfigMap: obsvReportConfigMap,
  });

  mockUseValuesList([{ label: 'elastic-co', count: 10 }]);

  it('renders', async () => {
    render(
      <ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} series={mockUxSeries} />
    );

    await waitFor(() => {
      expect(screen.getByText('Web Application')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
      expect(screen.getByText('Search Environment')).toBeInTheDocument();
    });
  });

  it('should render selected report definitions', async function () {
    render(
      <ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} series={mockUxSeries} />
    );

    expect(await screen.findByText('elastic-co')).toBeInTheDocument();

    expect(screen.getAllByTestId('comboBoxToggleListButton')[0]).toBeInTheDocument();
  });

  it('should be able to remove selected definition', async function () {
    const { setSeries } = render(
      <ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} series={mockUxSeries} />
    );

    expect(
      await screen.findByLabelText('Remove elastic-co from selection in this group')
    ).toBeInTheDocument();

    fireEvent.click(screen.getAllByTestId('comboBoxToggleListButton')[0]);

    const removeBtn = await screen.findByTitle(/Remove elastic-co from selection in this group/i);

    fireEvent.click(removeBtn);

    expect(setSeries).toHaveBeenCalledTimes(1);

    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      dataType: 'ux',
      name: 'performance-distribution',
      breakdown: 'user_agent.name',
      reportDefinitions: {},
      selectedMetricField: 'transaction.duration.us',
      time: { from: 'now-15m', to: 'now' },
    });
  });
});

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
  mockAppIndexPattern,
  mockIndexPattern,
  mockUseValuesList,
  render,
} from '../../rtl_helpers';
import { ReportDefinitionCol } from './report_definition_col';
import { SERVICE_NAME } from '../../configurations/constants/elasticsearch_fieldnames';

describe('Series Builder ReportDefinitionCol', function () {
  mockAppIndexPattern();
  const seriesId = 'test-series-id';

  const seriesConfig = getDefaultConfigs({
    reportType: 'data-distribution',
    indexPattern: mockIndexPattern,
    dataType: 'ux',
  });

  const initSeries = {
    data: {
      [seriesId]: {
        dataType: 'ux' as const,
        reportType: 'data-distribution' as const,
        time: { from: 'now-30d', to: 'now' },
        reportDefinitions: { [SERVICE_NAME]: ['elastic-co'] },
      },
    },
  };

  mockUseValuesList([{ label: 'elastic-co', count: 10 }]);

  it('should render properly', async function () {
    render(<ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} />, {
      initSeries,
    });

    await waitFor(() => {
      screen.getByText('Web Application');
      screen.getByText('Environment');
      screen.getByText('Select an option: Page load time, is selected');
      screen.getByText('Page load time');
    });
  });

  it('should render selected report definitions', async function () {
    render(<ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} />, {
      initSeries,
    });

    expect(await screen.findByText('elastic-co')).toBeInTheDocument();

    expect(screen.getAllByTestId('comboBoxToggleListButton')[0]).toBeInTheDocument();
  });

  it('should be able to remove selected definition', async function () {
    const { setSeries } = render(
      <ReportDefinitionCol seriesConfig={seriesConfig} seriesId={seriesId} />,
      { initSeries }
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
      reportDefinitions: {},
      reportType: 'data-distribution',
      time: { from: 'now-30d', to: 'now' },
    });
  });
});

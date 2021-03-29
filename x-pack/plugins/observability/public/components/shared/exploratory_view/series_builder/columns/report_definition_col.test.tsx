/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { mockIndexPattern, mockUrlStorage, mockUseValuesList, render } from '../../rtl_helpers';
import { NEW_SERIES_KEY } from '../../hooks/use_url_strorage';
import { ReportDefinitionCol } from './report_definition_col';
import { SERVICE_NAME } from '../../configurations/data/elasticsearch_fieldnames';

describe('Series Builder ReportDefinitionCol', function () {
  const dataViewSeries = getDefaultConfigs({
    reportType: 'pld',
    indexPattern: mockIndexPattern,
    seriesId: NEW_SERIES_KEY,
  });

  const { setSeries } = mockUrlStorage({
    data: {
      'performance-dist': {
        dataType: 'rum',
        reportType: 'pld',
        time: { from: 'now-30d', to: 'now' },
        reportDefinitions: { [SERVICE_NAME]: 'elastic-co' },
      },
    },
  });

  it('should render properly', async function () {
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} />);

    screen.getByText('Web Application');
    screen.getByText('Environment');
    screen.getByText('Select an option: Page load time, is selected');
    screen.getByText('Page load time');
  });

  it('should render selected report definitions', function () {
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} />);

    screen.getByText('elastic-co');
  });

  it('should be able to remove selected definition', function () {
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} />);

    const removeBtn = screen.getByText(/elastic-co/i);

    fireEvent.click(removeBtn);

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith('newSeriesKey', {
      dataType: 'rum',
      reportDefinitions: {},
      reportType: 'pld',
      time: { from: 'now-30d', to: 'now' },
    });
  });

  it('should be able to unselected selected definition', async function () {
    mockUseValuesList(['elastic-co']);
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} />);

    const definitionBtn = screen.getByText(/web application/i);

    fireEvent.click(definitionBtn);

    screen.getByText('Apply');
  });
});

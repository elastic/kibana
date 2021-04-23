/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { getDefaultConfigs } from '../../configurations/default_configs';
import {
  mockAppIndexPattern,
  mockIndexPattern,
  mockUrlStorage,
  mockUseValuesList,
  render,
} from '../../rtl_helpers';
import { ReportDefinitionCol } from './report_definition_col';
import { SERVICE_NAME } from '../../configurations/constants/elasticsearch_fieldnames';

describe('Series Builder ReportDefinitionCol', function () {
  mockAppIndexPattern();
  const seriesId = 'test-series-id';

  const dataViewSeries = getDefaultConfigs({
    seriesId,
    reportType: 'pld',
    indexPattern: mockIndexPattern,
  });

  const { setSeries } = mockUrlStorage({
    data: {
      'performance-dist': {
        dataType: 'ux',
        reportType: 'pld',
        time: { from: 'now-30d', to: 'now' },
        reportDefinitions: { [SERVICE_NAME]: ['elastic-co'] },
      },
    },
  });

  it('should render properly', async function () {
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    screen.getByText('Web Application');
    screen.getByText('Environment');
    screen.getByText('Select an option: Page load time, is selected');
    screen.getByText('Page load time');
  });

  it('should render selected report definitions', function () {
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    screen.getByTitle('Web Application: elastic-co');
  });

  it('should be able to remove selected definition', function () {
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    const removeBtn = screen.getByTitle(/Click to remove/i);

    fireEvent.click(removeBtn);

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      dataType: 'ux',
      reportDefinitions: {},
      reportType: 'pld',
      time: { from: 'now-30d', to: 'now' },
    });
  });

  it('should be able to unselected selected definition', async function () {
    mockUseValuesList(['elastic-co']);
    render(<ReportDefinitionCol dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    const definitionBtn = screen.getByText(/web application/i);

    fireEvent.click(definitionBtn);

    screen.getByText('Apply');
  });
});

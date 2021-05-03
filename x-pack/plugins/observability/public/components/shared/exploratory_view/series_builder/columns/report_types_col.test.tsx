/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockAppIndexPattern, mockUrlStorage, render } from '../../rtl_helpers';
import { ReportTypesCol, SELECTED_DATA_TYPE_FOR_REPORT } from './report_types_col';
import { ReportTypes } from '../series_builder';
import { DEFAULT_TIME } from '../../configurations/constants';
import { NEW_SERIES_KEY } from '../../hooks/use_url_storage';

describe('ReportTypesCol', function () {
  const seriesId = 'test-series-id';

  mockAppIndexPattern();

  it('should render properly', function () {
    render(<ReportTypesCol reportTypes={ReportTypes.ux} seriesId={seriesId} />);
    screen.getByText('Performance distribution');
    screen.getByText('KPI over time');
  });

  it('should display empty message', function () {
    render(<ReportTypesCol reportTypes={[]} seriesId={seriesId} />);
    screen.getByText(SELECTED_DATA_TYPE_FOR_REPORT);
  });

  it('should set series on change', function () {
    const { setSeries } = mockUrlStorage({});
    render(<ReportTypesCol reportTypes={ReportTypes.synthetics} seriesId={seriesId} />);

    fireEvent.click(screen.getByText(/monitor duration/i));

    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      breakdown: 'user_agent.name',
      dataType: 'ux',
      reportDefinitions: {},
      reportType: 'upd',
      time: { from: 'now-15m', to: 'now' },
    });
    expect(setSeries).toHaveBeenCalledTimes(1);
  });

  it('should set selected as filled', function () {
    const { setSeries } = mockUrlStorage({
      data: {
        [NEW_SERIES_KEY]: {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<ReportTypesCol reportTypes={ReportTypes.synthetics} seriesId={seriesId} />);

    const button = screen.getByRole('button', {
      name: /pings histogram/i,
    });

    expect(button.classList).toContain('euiButton--fill');
    fireEvent.click(button);

    // undefined on click selected
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      dataType: 'synthetics',
      time: DEFAULT_TIME,
    });
  });
});

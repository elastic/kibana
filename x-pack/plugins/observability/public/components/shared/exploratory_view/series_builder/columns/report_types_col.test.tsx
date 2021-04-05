/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockUrlStorage, render } from '../../rtl_helpers';
import { ReportTypesCol, SELECTED_DATA_TYPE_FOR_REPORT } from './report_types_col';
import { ReportTypes } from '../series_builder';

describe('ReportTypesCol', function () {
  it('should render properly', function () {
    render(<ReportTypesCol reportTypes={ReportTypes.rum} />);
    screen.getByText('Performance distribution');
    screen.getByText('KPI over time');
  });

  it('should display empty message', function () {
    render(<ReportTypesCol reportTypes={[]} />);
    screen.getByText(SELECTED_DATA_TYPE_FOR_REPORT);
  });

  it('should set series on change', function () {
    const { setSeries } = mockUrlStorage({});
    render(<ReportTypesCol reportTypes={ReportTypes.synthetics} />);

    fireEvent.click(screen.getByText(/monitor duration/i));

    expect(setSeries).toHaveBeenCalledWith('newSeriesKey', {
      breakdown: 'user_agent.name',
      reportDefinitions: {},
      reportType: 'upd',
      time: { from: 'now-15m', to: 'now' },
    });
    expect(setSeries).toHaveBeenCalledTimes(1);
  });

  it('should set selected as filled', function () {
    const { setSeries } = mockUrlStorage({
      data: {
        newSeriesKey: {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<ReportTypesCol reportTypes={ReportTypes.synthetics} />);

    const button = screen.getByRole('button', {
      name: /pings histogram/i,
    });

    expect(button.classList).toContain('euiButton--fill');
    fireEvent.click(button);

    // undefined on click selected
    expect(setSeries).toHaveBeenCalledWith('newSeriesKey', { dataType: 'synthetics' });
  });
});

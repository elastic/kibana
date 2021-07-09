/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockAppIndexPattern, mockUxSeries, render } from '../../rtl_helpers';
import { DataTypesSelect } from './data_type_select';

describe('DataTypeSelect', function () {
  const seriesId = 'test-series-id';

  mockAppIndexPattern();

  it('should render properly', function () {
    render(<DataTypesSelect seriesId={seriesId} series={mockUxSeries} />);
  });

  it('should set series on change', function () {
    const { setSeries } = render(<DataTypesSelect seriesId={seriesId} series={mockUxSeries} />);

    fireEvent.click(screen.getByText(/user experience \(rum\)/i));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      dataType: 'ux',
      isNew: true,
      time: {
        from: 'now-15m',
        to: 'now',
      },
    });
  });

  it('should set series on change on already selected', function () {
    const initSeries = {
      data: [
        {
          order: 0,
          name: seriesId,
          dataType: 'synthetics' as const,
          reportType: 'kpi-over-time' as const,
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      ],
    };

    render(<DataTypesSelect seriesId={seriesId} series={mockUxSeries} />, { initSeries });

    const button = screen.getByRole('button', {
      name: /Synthetic Monitoring/i,
    });

    expect(button.classList).toContain('euiButton--fill');
  });
});

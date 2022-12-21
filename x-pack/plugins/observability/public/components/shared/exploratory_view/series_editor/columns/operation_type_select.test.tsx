/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockUxSeries, render } from '../../rtl_helpers';
import { OperationTypeSelect } from './operation_type_select';

describe('OperationTypeSelect', function () {
  it('should render properly', function () {
    render(<OperationTypeSelect seriesId={0} series={mockUxSeries} />);

    screen.getByText('Select an option: , is selected');
  });

  it('should display selected value', function () {
    const initSeries = {
      data: [
        {
          name: 'performance-distribution',
          dataType: 'ux' as const,
          operationType: 'median' as const,
          time: { from: 'now-15m', to: 'now' },
        },
      ],
    };

    render(<OperationTypeSelect seriesId={0} series={initSeries.data[0]} />, {
      initSeries,
    });

    screen.getByText('Median');
  });

  it('should call set series on change', function () {
    const initSeries = {
      data: [
        {
          name: 'performance-distribution',
          dataType: 'ux' as const,
          operationType: 'median' as const,
          time: { from: 'now-15m', to: 'now' },
        },
      ],
    };

    const { setSeries } = render(<OperationTypeSelect seriesId={0} series={initSeries.data[0]} />, {
      initSeries,
    });

    fireEvent.click(screen.getByTestId('operationTypeSelect'));

    fireEvent.click(screen.getByText('95th Percentile'));
    expect(setSeries).toHaveBeenCalledWith(0, {
      operationType: '95th',
      dataType: 'ux',
      time: { from: 'now-15m', to: 'now' },
      name: 'performance-distribution',
    });
  });
});

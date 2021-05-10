/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockUrlStorage, render } from '../../rtl_helpers';
import { OperationTypeSelect } from './operation_type_select';

describe('OperationTypeSelect', function () {
  it('should render properly', function () {
    render(<OperationTypeSelect seriesId={'series-id'} />);

    screen.getByText('Select an option: , is selected');
  });

  it('should display selected value', function () {
    mockUrlStorage({
      data: {
        'performance-distribution': {
          dataType: 'ux',
          reportType: 'kpi',
          operationType: 'median',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<OperationTypeSelect seriesId={'series-id'} />);

    screen.getByText('Median');
  });

  it('should call set series on change', function () {
    const { setSeries } = mockUrlStorage({
      data: {
        'series-id': {
          dataType: 'ux',
          reportType: 'kpi',
          operationType: 'median',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<OperationTypeSelect seriesId={'series-id'} />);

    fireEvent.click(screen.getByTestId('operationTypeSelect'));

    expect(setSeries).toHaveBeenCalledWith('series-id', {
      operationType: 'median',
      dataType: 'ux',
      reportType: 'kpi',
      time: { from: 'now-15m', to: 'now' },
    });

    fireEvent.click(screen.getByText('95th Percentile'));
    expect(setSeries).toHaveBeenCalledWith('series-id', {
      operationType: '95th',
      dataType: 'ux',
      reportType: 'kpi',
      time: { from: 'now-15m', to: 'now' },
    });
  });
});
